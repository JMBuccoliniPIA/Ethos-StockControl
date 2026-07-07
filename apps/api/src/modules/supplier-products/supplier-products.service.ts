import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, FilterQuery, Types } from 'mongoose';
import { SupplierProduct, SupplierProductDocument } from './schemas/supplier-product.schema';
import { UnifiedProduct, UnifiedProductDocument } from '../unified-products/schemas/unified-product.schema';
import { CreateSupplierProductDto } from './dto/create-supplier-product.dto';
import { UpdateSupplierProductDto } from './dto/update-supplier-product.dto';
import { QuerySupplierProductDto } from './dto/query-supplier-product.dto';

@Injectable()
export class SupplierProductsService {
  constructor(
    @InjectModel(SupplierProduct.name)
    private supplierProductModel: Model<SupplierProductDocument>,
    @InjectModel(UnifiedProduct.name)
    private unifiedProductModel: Model<UnifiedProductDocument>,
  ) {}

  async create(dto: CreateSupplierProductDto): Promise<SupplierProductDocument> {
    const existing = await this.supplierProductModel.findOne({
      supplierId: new Types.ObjectId(dto.supplierId),
      supplierSku: dto.supplierSku,
    });

    if (existing) {
      throw new ConflictException(
        `Ya existe un producto con SKU "${dto.supplierSku}" para este proveedor`
      );
    }

    return this.supplierProductModel.create({
      ...dto,
      supplierId: new Types.ObjectId(dto.supplierId),
    });
  }

  async createOrUpdate(
    dto: CreateSupplierProductDto,
    importJobId?: string,
  ): Promise<{
    product: SupplierProductDocument;
    isNew: boolean;
  }> {
    const normalizedSku = dto.supplierSku.trim().toUpperCase();
    const jobId = importJobId ? new Types.ObjectId(importJobId) : undefined;
    const existing = await this.supplierProductModel.findOne({
      supplierId: new Types.ObjectId(dto.supplierId),
      supplierSku: normalizedSku,
    });

    if (existing) {
      // Update prices
      existing.supplierName = dto.supplierName;
      existing.supplierDescription = dto.supplierDescription;
      existing.supplierCategory = dto.supplierCategory;
      if (dto.color !== undefined) existing.color = dto.color;
      existing.basePrice = dto.basePrice;
      existing.discountPercent = dto.discountPercent ?? 0;
      if (dto.currency) existing.currency = dto.currency;
      if (dto.metadata) existing.metadata = dto.metadata;
      if (jobId) existing.importJobId = jobId;
      await existing.save();
      return { product: existing, isNew: false };
    }

    const product = await this.supplierProductModel.create({
      ...dto,
      supplierId: new Types.ObjectId(dto.supplierId),
      ...(jobId ? { importJobId: jobId } : {}),
    });
    return { product, isNew: true };
  }

  async findAll(query: QuerySupplierProductDto = {}) {
    const { page = 1, limit = 20, search, supplierId, unmapped } = query;
    const filter: FilterQuery<SupplierProduct> = {};

    if (search) {
      filter.$or = [
        { supplierName: { $regex: search, $options: 'i' } },
        { supplierSku: { $regex: search, $options: 'i' } },
      ];
    }
    if (supplierId) {
      filter.supplierId = new Types.ObjectId(supplierId);
    }
    if (unmapped === 'true') {
      filter.$and = [
        ...(filter.$and || []),
        { $or: [{ unifiedProductId: null }, { unifiedProductId: { $exists: false } }] },
      ];
    } else if (unmapped === 'false') {
      filter.unifiedProductId = { $ne: null };
    }

    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.supplierProductModel
        .find(filter)
        .populate('supplierId', 'name code')
        .sort({ supplierName: 1 })
        .skip(skip)
        .limit(limit),
      this.supplierProductModel.countDocuments(filter),
    ]);

    return {
      data,
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / limit),
    };
  }

  async findBySupplier(supplierId: string, query: QuerySupplierProductDto = {}) {
    return this.findAll({ ...query, supplierId });
  }

  async findUnmapped(query: QuerySupplierProductDto = {}) {
    return this.findAll({ ...query, unmapped: 'true' });
  }

  async findById(id: string): Promise<SupplierProductDocument> {
    const product = await this.supplierProductModel
      .findById(id)
      .populate('supplierId', 'name code');
    if (!product) throw new NotFoundException('Producto de proveedor no encontrado');
    return product;
  }

  async update(id: string, dto: UpdateSupplierProductDto): Promise<SupplierProductDocument> {
    const product = await this.supplierProductModel.findById(id);
    if (!product) throw new NotFoundException('Producto de proveedor no encontrado');

    Object.assign(product, dto);
    await product.save();
    return product;
  }

  async delete(id: string): Promise<void> {
    const result = await this.supplierProductModel.findByIdAndDelete(id);
    if (!result) throw new NotFoundException('Producto de proveedor no encontrado');
    // Clear any dangling selection on unified products that used this cost source
    await this.clearUnifiedSelection(id);
  }

  /**
   * When a supplier product stops being available (deleted or unlinked), any
   * UnifiedProduct that had it selected as its cost source must drop the
   * selection so salePrice isn't derived from a stale/removed cost.
   */
  private async clearUnifiedSelection(supplierProductId: string): Promise<void> {
    await this.unifiedProductModel.updateMany(
      { selectedSupplierProductId: new Types.ObjectId(supplierProductId) },
      { $set: { selectedCost: 0, salePrice: 0 }, $unset: { selectedSupplierProductId: '' } },
    );
  }

  async linkToUnifiedProduct(
    supplierProductId: string,
    unifiedProductId: string,
  ): Promise<SupplierProductDocument> {
    const product = await this.supplierProductModel.findById(supplierProductId);
    if (!product) throw new NotFoundException('Producto de proveedor no encontrado');

    product.unifiedProductId = new Types.ObjectId(unifiedProductId);
    await product.save();
    return product;
  }

  async unlinkFromUnifiedProduct(supplierProductId: string): Promise<SupplierProductDocument> {
    const product = await this.supplierProductModel.findById(supplierProductId);
    if (!product) throw new NotFoundException('Producto de proveedor no encontrado');

    product.unifiedProductId = undefined;
    await product.save();
    // Drop the selection if this product was the selected cost source
    await this.clearUnifiedSelection(supplierProductId);
    return product;
  }

  async findByUnifiedProduct(unifiedProductId: string): Promise<SupplierProductDocument[]> {
    return this.supplierProductModel
      .find({ unifiedProductId: new Types.ObjectId(unifiedProductId) })
      .populate('supplierId', 'name code')
      .sort({ netCost: 1 });
  }
}
