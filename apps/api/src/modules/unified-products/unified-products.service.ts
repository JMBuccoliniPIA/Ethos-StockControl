import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, FilterQuery, Types } from 'mongoose';
import { UnifiedProduct, UnifiedProductDocument } from './schemas/unified-product.schema';
import { SupplierProduct, SupplierProductDocument } from '../supplier-products/schemas/supplier-product.schema';
import { CreateUnifiedProductDto } from './dto/create-unified-product.dto';
import { UpdateUnifiedProductDto } from './dto/update-unified-product.dto';
import { QueryUnifiedProductDto } from './dto/query-unified-product.dto';

@Injectable()
export class UnifiedProductsService {
  constructor(
    @InjectModel(UnifiedProduct.name)
    private unifiedProductModel: Model<UnifiedProductDocument>,
    @InjectModel(SupplierProduct.name)
    private supplierProductModel: Model<SupplierProductDocument>,
  ) {}

  async create(
    dto: CreateUnifiedProductDto,
    userId?: string,
  ): Promise<UnifiedProductDocument> {
    const existing = await this.unifiedProductModel.findOne({
      sku: dto.sku.toUpperCase(),
    });
    if (existing) {
      throw new ConflictException(`Ya existe un producto unificado con SKU "${dto.sku}"`);
    }

    const product = new this.unifiedProductModel({
      ...dto,
      sku: dto.sku.toUpperCase(),
      createdBy: userId,
    });
    return product.save();
  }

  async findAll(query: QueryUnifiedProductDto) {
    const {
      page = 1,
      limit = 20,
      search,
      familyId,
      subfamilyId,
      status,
      hasSupplier,
    } = query;

    const filter: FilterQuery<UnifiedProduct> = {};

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { sku: { $regex: search, $options: 'i' } },
      ];
    }
    if (familyId) filter.familyId = familyId;
    if (subfamilyId) filter.subfamilyId = subfamilyId;
    if (status) filter.status = status;
    if (hasSupplier === 'true') {
      filter.selectedSupplierProductId = { $ne: null };
    } else if (hasSupplier === 'false') {
      filter.selectedSupplierProductId = null;
    }

    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.unifiedProductModel
        .find(filter)
        .populate('familyId', 'name')
        .populate('subfamilyId', 'name')
        .populate({
          path: 'selectedSupplierProductId',
          populate: { path: 'supplierId', select: 'name' },
        })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      this.unifiedProductModel.countDocuments(filter),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findById(id: string): Promise<UnifiedProductDocument> {
    const product = await this.unifiedProductModel
      .findById(id)
      .populate('familyId', 'name')
      .populate('subfamilyId', 'name')
      .populate({
        path: 'selectedSupplierProductId',
        populate: { path: 'supplierId', select: 'name' },
      })
      .populate('createdBy', 'firstName lastName');
    if (!product) throw new NotFoundException('Producto unificado no encontrado');
    return product;
  }

  async findBySku(sku: string): Promise<UnifiedProductDocument | null> {
    return this.unifiedProductModel.findOne({ sku: sku.toUpperCase() });
  }

  async update(
    id: string,
    dto: UpdateUnifiedProductDto,
  ): Promise<UnifiedProductDocument> {
    const product = await this.unifiedProductModel.findById(id);
    if (!product) throw new NotFoundException('Producto unificado no encontrado');

    Object.assign(product, dto);
    return product.save();
  }

  async delete(id: string): Promise<void> {
    // Unlink all supplier products first
    await this.supplierProductModel.updateMany(
      { unifiedProductId: id },
      { $unset: { unifiedProductId: 1 } },
    );

    const result = await this.unifiedProductModel.findByIdAndDelete(id);
    if (!result) throw new NotFoundException('Producto unificado no encontrado');
  }

  /**
   * Select a supplier product as the price source
   */
  async selectSupplier(
    id: string,
    supplierProductId: string,
  ): Promise<UnifiedProductDocument> {
    const product = await this.unifiedProductModel.findById(id);
    if (!product) throw new NotFoundException('Producto unificado no encontrado');

    const supplierProduct = await this.supplierProductModel.findById(supplierProductId);
    if (!supplierProduct) {
      throw new NotFoundException('Producto de proveedor no encontrado');
    }

    // Ensure the supplier product is linked to this unified product
    if (
      supplierProduct.unifiedProductId &&
      supplierProduct.unifiedProductId.toString() !== id
    ) {
      throw new BadRequestException(
        'El producto de proveedor está asociado a otro producto unificado',
      );
    }

    // Link supplier product if not already linked
    if (!supplierProduct.unifiedProductId) {
      supplierProduct.unifiedProductId = new Types.ObjectId(id);
      await supplierProduct.save();
    }

    // Update unified product with selected supplier
    product.selectedSupplierProductId = new Types.ObjectId(supplierProductId);
    product.selectedCost = supplierProduct.netCost;
    return product.save(); // salePrice calculated in pre-save hook
  }

  /**
   * Update profit margin and recalculate sale price
   */
  async updateMargin(
    id: string,
    profitMarginPercent: number,
  ): Promise<UnifiedProductDocument> {
    if (profitMarginPercent < 0 || profitMarginPercent > 100) {
      throw new BadRequestException('El margen debe estar entre 0 y 100');
    }

    const product = await this.unifiedProductModel.findById(id);
    if (!product) throw new NotFoundException('Producto unificado no encontrado');

    product.profitMarginPercent = profitMarginPercent;
    return product.save(); // salePrice recalculated in pre-save hook
  }

  /**
   * Get all supplier products linked to a unified product
   */
  async getLinkedSupplierProducts(id: string): Promise<SupplierProductDocument[]> {
    return this.supplierProductModel
      .find({ unifiedProductId: id })
      .populate('supplierId', 'name code');
  }

  /**
   * Link a supplier product to this unified product
   */
  async linkSupplierProduct(
    id: string,
    supplierProductId: string,
  ): Promise<SupplierProductDocument> {
    const product = await this.unifiedProductModel.findById(id);
    if (!product) throw new NotFoundException('Producto unificado no encontrado');

    const supplierProduct = await this.supplierProductModel.findById(supplierProductId);
    if (!supplierProduct) {
      throw new NotFoundException('Producto de proveedor no encontrado');
    }

    if (supplierProduct.unifiedProductId) {
      throw new BadRequestException(
        'El producto de proveedor ya está asociado a otro producto',
      );
    }

    supplierProduct.unifiedProductId = new Types.ObjectId(id);
    return supplierProduct.save();
  }

  /**
   * Unlink a supplier product from this unified product
   */
  async unlinkSupplierProduct(
    id: string,
    supplierProductId: string,
  ): Promise<void> {
    const product = await this.unifiedProductModel.findById(id);
    if (!product) throw new NotFoundException('Producto unificado no encontrado');

    const supplierProduct = await this.supplierProductModel.findById(supplierProductId);
    if (!supplierProduct) {
      throw new NotFoundException('Producto de proveedor no encontrado');
    }

    if (supplierProduct.unifiedProductId?.toString() !== id) {
      throw new BadRequestException(
        'El producto de proveedor no está asociado a este producto unificado',
      );
    }

    // If this was the selected supplier, clear selection
    if (product.selectedSupplierProductId?.toString() === supplierProductId) {
      product.selectedSupplierProductId = undefined;
      product.selectedCost = 0;
      await product.save();
    }

    supplierProduct.unifiedProductId = undefined;
    await supplierProduct.save();
  }

  /**
   * Refresh cost from selected supplier (useful after supplier price update)
   */
  async refreshCost(id: string): Promise<UnifiedProductDocument> {
    const product = await this.unifiedProductModel.findById(id);
    if (!product) throw new NotFoundException('Producto unificado no encontrado');

    if (!product.selectedSupplierProductId) {
      throw new BadRequestException('No hay proveedor seleccionado');
    }

    const supplierProduct = await this.supplierProductModel.findById(
      product.selectedSupplierProductId,
    );
    if (!supplierProduct) {
      throw new NotFoundException('Producto de proveedor no encontrado');
    }

    product.selectedCost = supplierProduct.netCost;
    return product.save();
  }

  /**
   * Adjust stock
   */
  async adjustStock(
    id: string,
    quantity: number,
  ): Promise<{ previousStock: number; newStock: number }> {
    const product = await this.unifiedProductModel.findById(id);
    if (!product) throw new NotFoundException('Producto unificado no encontrado');

    const previousStock = product.stock;
    product.stock = Math.max(0, product.stock + quantity);
    await product.save();

    return { previousStock, newStock: product.stock };
  }

  /**
   * Get statistics
   */
  async getStats() {
    const [total, active, withSupplier, lowStock, totalValue] = await Promise.all([
      this.unifiedProductModel.countDocuments(),
      this.unifiedProductModel.countDocuments({ status: 'active' }),
      this.unifiedProductModel.countDocuments({
        selectedSupplierProductId: { $ne: null },
      }),
      this.unifiedProductModel.countDocuments({
        $expr: { $and: [{ $lte: ['$stock', '$stockMin'] }, { $gt: ['$stock', 0] }] },
      }),
      this.unifiedProductModel.aggregate([
        { $match: { status: 'active' } },
        {
          $group: {
            _id: null,
            total: { $sum: { $multiply: ['$stock', '$salePrice'] } },
          },
        },
      ]),
    ]);

    return {
      totalProducts: total,
      activeProducts: active,
      withSupplier,
      lowStockCount: lowStock,
      totalStockValue: totalValue[0]?.total ?? 0,
    };
  }
}
