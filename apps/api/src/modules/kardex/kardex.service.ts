import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { InjectModel, InjectConnection } from '@nestjs/mongoose';
import { Model, Connection, FilterQuery, ClientSession } from 'mongoose';
import { StockLot, StockLotDocument } from './schemas/stock-lot.schema';
import { KardexEntry, KardexEntryDocument } from './schemas/kardex-entry.schema';
import { CreateKardexEntryDto } from './dto/create-kardex-entry.dto';
import { QueryKardexDto } from './dto/query-kardex.dto';
import { ProductsService } from '../products/products.service';
import { UnifiedProductsService } from '../unified-products/unified-products.service';
import { MovementType, ProductEntityType } from '../../common/constants';

interface FIFOConsumption {
  lotId: string;
  quantity: number;
  unitCost: number;
}

@Injectable()
export class KardexService {
  private readonly logger = new Logger(KardexService.name);

  constructor(
    @InjectModel(KardexEntry.name)
    private kardexEntryModel: Model<KardexEntryDocument>,
    @InjectModel(StockLot.name)
    private stockLotModel: Model<StockLotDocument>,
    @InjectConnection()
    private connection: Connection,
    private productsService: ProductsService,
    private unifiedProductsService: UnifiedProductsService,
  ) {}

  /**
   * Record a Kardex entry with FIFO costing.
   * Tries to use a MongoDB transaction for atomicity; falls back to
   * non-transactional execution on standalone instances.
   */
  async recordEntry(
    dto: CreateKardexEntryDto,
    userId: string,
    skipStockAdjust = false,
    knownPreviousStock?: number,
  ) {
    // Try with transaction first, fallback to non-transactional
    try {
      return await this.executeWithTransaction(dto, userId, skipStockAdjust, knownPreviousStock);
    } catch (err: any) {
      // Standalone MongoDB doesn't support transactions
      if (
        err.message?.includes('Transaction numbers are only allowed on a replica set') ||
        err.codeName === 'IllegalOperation'
      ) {
        return await this.executeWithoutTransaction(dto, userId, skipStockAdjust, knownPreviousStock);
      }
      throw err;
    }
  }

  private async executeWithTransaction(
    dto: CreateKardexEntryDto,
    userId: string,
    skipStockAdjust: boolean,
    knownPreviousStock?: number,
  ) {
    const session = await this.connection.startSession();
    try {
      let result: KardexEntryDocument;
      await session.withTransaction(async () => {
        result = await this.processEntry(dto, userId, skipStockAdjust, session, knownPreviousStock);
      });
      return result!;
    } finally {
      await session.endSession();
    }
  }

  private async executeWithoutTransaction(
    dto: CreateKardexEntryDto,
    userId: string,
    skipStockAdjust: boolean,
    knownPreviousStock?: number,
  ) {
    return this.processEntry(dto, userId, skipStockAdjust, null, knownPreviousStock);
  }

  private async processEntry(
    dto: CreateKardexEntryDto,
    userId: string,
    skipStockAdjust: boolean,
    session: ClientSession | null,
    knownPreviousStock?: number,
  ): Promise<KardexEntryDocument> {
    // When the caller already applied the stock change (bridge from StockService),
    // it passes the pre-movement stock so the ledger snapshot stays correct
    // instead of re-reading the already-mutated value.
    const previousStock =
      knownPreviousStock ??
      (await this.resolveProduct(dto.productId, dto.productType)).stock;
    const lastBalance = await this.getLastBalance(dto.productId, dto.productType);

    let result: KardexEntryDocument;

    switch (dto.type) {
      case MovementType.IN:
        result = await this.handleEntry(dto, userId, previousStock, lastBalance, session);
        break;
      case MovementType.OUT:
        result = await this.handleExit(dto, userId, previousStock, lastBalance, session);
        break;
      case MovementType.ADJUSTMENT:
        result = await this.handleAdjustment(dto, userId, previousStock, lastBalance, session);
        break;
      default:
        throw new BadRequestException('Tipo de movimiento inválido');
    }

    if (!skipStockAdjust) {
      await this.adjustProductStock(dto.productId, dto.productType, result.newStock - previousStock);
    }

    return result;
  }

  private async handleEntry(
    dto: CreateKardexEntryDto,
    userId: string,
    previousStock: number,
    lastBalance: { balanceQuantity: number; balanceAmount: number },
    session: ClientSession | null,
  ): Promise<KardexEntryDocument> {
    const unitCost = dto.unitCost ?? 0;
    const entryAmount = dto.quantity * unitCost;
    const opts = session ? { session } : {};

    await this.stockLotModel.create(
      [{
        productId: dto.productId,
        productType: dto.productType,
        supplierId: dto.supplierId,
        documentNumber: dto.documentNumber,
        unitCost,
        initialQuantity: dto.quantity,
        remainingQuantity: dto.quantity,
        location: dto.location,
      }],
      opts,
    );

    const newBalanceQuantity = lastBalance.balanceQuantity + dto.quantity;
    const newBalanceAmount = lastBalance.balanceAmount + entryAmount;
    const newStock = previousStock + dto.quantity;

    const [entry] = await this.kardexEntryModel.create(
      [{
        productId: dto.productId,
        productType: dto.productType,
        type: MovementType.IN,
        entryQuantity: dto.quantity,
        entryUnitCost: unitCost,
        entryAmount,
        balanceQuantity: newBalanceQuantity,
        balanceAmount: newBalanceAmount,
        documentNumber: dto.documentNumber,
        supplierId: dto.supplierId,
        location: dto.location,
        reason: dto.reason,
        previousStock,
        newStock,
        performedBy: userId,
      }],
      opts,
    );

    return entry;
  }

  private async handleExit(
    dto: CreateKardexEntryDto,
    userId: string,
    previousStock: number,
    lastBalance: { balanceQuantity: number; balanceAmount: number },
    session: ClientSession | null,
  ): Promise<KardexEntryDocument> {
    if (previousStock < dto.quantity) {
      throw new BadRequestException(
        `Stock insuficiente. Disponible: ${previousStock}, solicitado: ${dto.quantity}`,
      );
    }

    const { consumptions, totalCost } = await this.consumeFIFO(
      dto.productId,
      dto.productType,
      dto.quantity,
      session,
    );

    const exitUnitCost = dto.quantity > 0 ? totalCost / dto.quantity : 0;
    const newBalanceQuantity = lastBalance.balanceQuantity - dto.quantity;
    const newBalanceAmount = lastBalance.balanceAmount - totalCost;
    const newStock = previousStock - dto.quantity;
    const opts = session ? { session } : {};

    const [entry] = await this.kardexEntryModel.create(
      [{
        productId: dto.productId,
        productType: dto.productType,
        type: MovementType.OUT,
        exitQuantity: dto.quantity,
        exitUnitCost,
        exitAmount: totalCost,
        balanceQuantity: newBalanceQuantity,
        balanceAmount: Math.max(0, newBalanceAmount),
        documentNumber: dto.documentNumber,
        supplierId: dto.supplierId,
        location: dto.location,
        reason: dto.reason,
        lotConsumptions: consumptions.map((c) => ({
          lotId: c.lotId,
          quantity: c.quantity,
          unitCost: c.unitCost,
        })),
        previousStock,
        newStock,
        performedBy: userId,
      }],
      opts,
    );

    return entry;
  }

  private async handleAdjustment(
    dto: CreateKardexEntryDto,
    userId: string,
    previousStock: number,
    lastBalance: { balanceQuantity: number; balanceAmount: number },
    session: ClientSession | null,
  ): Promise<KardexEntryDocument> {
    const targetStock = dto.quantity;
    const delta = targetStock - previousStock;
    const opts = session ? { session } : {};

    if (delta > 0) {
      const unitCost = dto.unitCost ?? 0;
      const entryAmount = delta * unitCost;

      if (unitCost > 0) {
        await this.stockLotModel.create(
          [{
            productId: dto.productId,
            productType: dto.productType,
            supplierId: dto.supplierId,
            documentNumber: dto.documentNumber,
            unitCost,
            initialQuantity: delta,
            remainingQuantity: delta,
            location: dto.location,
          }],
          opts,
        );
      }

      const [entry] = await this.kardexEntryModel.create(
        [{
          productId: dto.productId,
          productType: dto.productType,
          type: MovementType.ADJUSTMENT,
          entryQuantity: delta,
          entryUnitCost: unitCost,
          entryAmount,
          balanceQuantity: lastBalance.balanceQuantity + delta,
          balanceAmount: lastBalance.balanceAmount + entryAmount,
          documentNumber: dto.documentNumber,
          supplierId: dto.supplierId,
          location: dto.location,
          reason: dto.reason,
          previousStock,
          newStock: targetStock,
          performedBy: userId,
        }],
        opts,
      );

      return entry;
    } else if (delta < 0) {
      const absQty = Math.abs(delta);
      const { consumptions, totalCost } = await this.consumeFIFO(
        dto.productId,
        dto.productType,
        absQty,
        session,
      );

      const exitUnitCost = absQty > 0 ? totalCost / absQty : 0;

      const [entry] = await this.kardexEntryModel.create(
        [{
          productId: dto.productId,
          productType: dto.productType,
          type: MovementType.ADJUSTMENT,
          exitQuantity: absQty,
          exitUnitCost,
          exitAmount: totalCost,
          balanceQuantity: lastBalance.balanceQuantity - absQty,
          balanceAmount: Math.max(0, lastBalance.balanceAmount - totalCost),
          documentNumber: dto.documentNumber,
          supplierId: dto.supplierId,
          location: dto.location,
          reason: dto.reason,
          lotConsumptions: consumptions.map((c) => ({
            lotId: c.lotId,
            quantity: c.quantity,
            unitCost: c.unitCost,
          })),
          previousStock,
          newStock: targetStock,
          performedBy: userId,
        }],
        opts,
      );

      return entry;
    } else {
      const [entry] = await this.kardexEntryModel.create(
        [{
          productId: dto.productId,
          productType: dto.productType,
          type: MovementType.ADJUSTMENT,
          balanceQuantity: lastBalance.balanceQuantity,
          balanceAmount: lastBalance.balanceAmount,
          reason: dto.reason,
          previousStock,
          newStock: targetStock,
          performedBy: userId,
        }],
        opts,
      );

      return entry;
    }
  }

  private async consumeFIFO(
    productId: string,
    productType: ProductEntityType,
    quantity: number,
    session: ClientSession | null,
  ): Promise<{ consumptions: FIFOConsumption[]; totalCost: number }> {
    const query = this.stockLotModel
      .find({
        productId,
        productType,
        remainingQuantity: { $gt: 0 },
      })
      .sort({ createdAt: 1 });

    const lots = session ? await query.session(session) : await query;

    let remaining = quantity;
    const consumptions: FIFOConsumption[] = [];
    let totalCost = 0;

    for (const lot of lots) {
      if (remaining <= 0) break;

      const consume = Math.min(remaining, lot.remainingQuantity);
      lot.remainingQuantity -= consume;
      await (session ? lot.save({ session }) : lot.save());

      consumptions.push({
        lotId: lot._id.toString(),
        quantity: consume,
        unitCost: lot.unitCost,
      });

      totalCost += consume * lot.unitCost;
      remaining -= consume;
    }

    if (remaining > 0) {
      // Not enough FIFO lots to cover the exit (e.g. stock seeded/adjusted
      // without cost lots). Record the movement anyway — but DON'T push a fake
      // 'uncovered' lotId, since lotConsumptions.lotId is an ObjectId and the
      // string would throw a cast error, silently dropping the whole entry.
      this.logger.warn(
        `FIFO parcial: ${remaining} unidad(es) sin lote de costo para producto ${productId}`,
      );
    }

    return { consumptions, totalCost };
  }

  async getKardex(query: QueryKardexDto) {
    const { productId, productType, type, dateFrom, dateTo, page = 1, limit = 50 } = query;

    const filter: FilterQuery<KardexEntry> = { productId, productType };
    if (type) filter.type = type;
    if (dateFrom || dateTo) {
      filter.createdAt = {};
      if (dateFrom) filter.createdAt.$gte = new Date(dateFrom);
      if (dateTo) filter.createdAt.$lte = new Date(dateTo);
    }

    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.kardexEntryModel
        .find(filter)
        .populate('supplierId', 'name')
        .populate('performedBy', 'firstName lastName')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      this.kardexEntryModel.countDocuments(filter),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getProductLots(productId: string, productType: ProductEntityType) {
    return this.stockLotModel
      .find({ productId, productType, remainingQuantity: { $gt: 0 } })
      .populate('supplierId', 'name')
      .sort({ createdAt: 1 });
  }

  async getKardexSummary(productId: string, productType: ProductEntityType) {
    const lastEntry = await this.kardexEntryModel
      .findOne({ productId, productType })
      .sort({ createdAt: -1 });

    const activeLots = await this.stockLotModel.countDocuments({
      productId,
      productType,
      remainingQuantity: { $gt: 0 },
    });

    const balanceQuantity = lastEntry?.balanceQuantity ?? 0;
    const balanceAmount = lastEntry?.balanceAmount ?? 0;
    const averageCost = balanceQuantity > 0 ? balanceAmount / balanceQuantity : 0;

    return {
      balanceQuantity,
      balanceAmount,
      averageCost,
      activeLots,
    };
  }

  private async getLastBalance(
    productId: string,
    productType: ProductEntityType,
  ): Promise<{ balanceQuantity: number; balanceAmount: number }> {
    const lastEntry = await this.kardexEntryModel
      .findOne({ productId, productType })
      .sort({ createdAt: -1 });

    return {
      balanceQuantity: lastEntry?.balanceQuantity ?? 0,
      balanceAmount: lastEntry?.balanceAmount ?? 0,
    };
  }

  private async resolveProduct(productId: string, productType: ProductEntityType) {
    if (productType === ProductEntityType.PRODUCT) {
      return this.productsService.findById(productId);
    }
    return this.unifiedProductsService.findById(productId);
  }

  private async adjustProductStock(productId: string, productType: ProductEntityType, delta: number) {
    if (delta === 0) return;
    if (productType === ProductEntityType.PRODUCT) {
      return this.productsService.adjustStock(productId, delta);
    }
    return this.unifiedProductsService.adjustStock(productId, delta);
  }
}
