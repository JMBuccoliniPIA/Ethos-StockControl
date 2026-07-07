import {
  Injectable,
  BadRequestException,
  Inject,
  Optional,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, FilterQuery } from 'mongoose';
import { StockMovement, StockMovementDocument } from './schemas/stock-movement.schema';
import { CreateMovementDto } from './dto/create-movement.dto';
import { QueryMovementDto } from './dto/query-movement.dto';
import { ProductsService } from '../products/products.service';
import { KardexService } from '../kardex/kardex.service';
import { MovementType, ProductEntityType } from '../../common/constants';

@Injectable()
export class StockService {
  constructor(
    @InjectModel(StockMovement.name)
    private movementModel: Model<StockMovementDocument>,
    private productsService: ProductsService,
    @Optional() @Inject(KardexService) private kardexService?: KardexService,
  ) {}

  async createMovement(dto: CreateMovementDto, userId: string) {
    // Ensure the product exists (throws 404 otherwise)
    await this.productsService.findById(dto.productId);

    // For incoming stock, supplier + remito are mandatory
    if (dto.type === MovementType.IN) {
      if (!dto.supplierId) {
        throw new BadRequestException('El proveedor es obligatorio en entradas de stock');
      }
      if (!dto.documentNumber || !dto.documentNumber.trim()) {
        throw new BadRequestException('El número de remito es obligatorio en entradas de stock');
      }
    }

    // Apply the stock change atomically (guards against oversell / races).
    // For ADJUSTMENT, quantity is the absolute target value.
    const { previousStock, newStock } = await this.productsService.applyMovement(
      dto.productId,
      dto.type,
      dto.quantity,
    );

    const movement = await this.movementModel.create({
      productId: dto.productId,
      type: dto.type,
      quantity: dto.quantity,
      reason: dto.reason,
      previousStock,
      newStock,
      supplierId: dto.supplierId,
      documentNumber: dto.documentNumber?.trim(),
      performedBy: userId,
    });

    // Bridge: also create a Kardex entry if the service is available.
    // Pass the real previousStock (knownPreviousStock) so the ledger snapshot
    // is correct, and skipStockAdjust because we already applied the change.
    if (this.kardexService) {
      try {
        await this.kardexService.recordEntry(
          {
            productId: dto.productId,
            productType: ProductEntityType.PRODUCT,
            type: dto.type,
            quantity: dto.quantity,
            unitCost: dto.unitCost,
            documentNumber: dto.documentNumber,
            supplierId: dto.supplierId,
            location: dto.location,
            reason: dto.reason,
          },
          userId,
          true, // skipStockAdjust: StockService already adjusted the stock
          previousStock, // knownPreviousStock: avoid re-reading the mutated stock
        );
      } catch {
        // Kardex entry creation is non-blocking for backward compatibility
      }
    }

    return {
      movement,
      previousStock,
      newStock,
    };
  }

  async findMovements(query: QueryMovementDto) {
    const { productId, type, page = 1, limit = 20 } = query;

    const filter: FilterQuery<StockMovement> = {};
    if (productId) filter.productId = productId;
    if (type) filter.type = type;

    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.movementModel
        .find(filter)
        .populate('productId', 'name sku')
        .populate('performedBy', 'firstName lastName')
        .populate('supplierId', 'name code')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      this.movementModel.countDocuments(filter),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getProductMovements(productId: string, limit = 50) {
    return this.movementModel
      .find({ productId })
      .populate('performedBy', 'firstName lastName')
      .populate('supplierId', 'name code')
      .sort({ createdAt: -1 })
      .limit(limit);
  }

  /**
   * Return the supplier from the most recent IN movement of this product.
   * Used to pre-fill (disabled) the supplier field on OUT movements,
   * since each SKU belongs to a single supplier in this system.
   */
  async getLastSupplierForProduct(productId: string) {
    const lastIn = await this.movementModel
      .findOne({ productId, type: MovementType.IN, supplierId: { $ne: null } })
      .populate('supplierId', 'name code')
      .sort({ createdAt: -1 })
      .select('supplierId documentNumber createdAt');

    if (!lastIn?.supplierId) return null;
    return {
      supplier: lastIn.supplierId,
      lastDocumentNumber: lastIn.documentNumber,
      lastInAt: (lastIn as any).createdAt,
    };
  }
}
