import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { SupplierProduct, SupplierProductDocument } from './schemas/supplier-product.schema';
import { CreateSupplierProductDto } from './dto/create-supplier-product.dto';
import { UpdateSupplierProductDto } from './dto/update-supplier-product.dto';

@Injectable()
export class SupplierProductsService {
  constructor(
    @InjectModel(SupplierProduct.name)
    private supplierProductModel: Model<SupplierProductDocument>,
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

  async createOrUpdate(dto: CreateSupplierProductDto): Promise<{
    product: SupplierProductDocument;
    isNew: boolean;
  }> {
    const existing = await this.supplierProductModel.findOne({
      supplierId: new Types.ObjectId(dto.supplierId),
      supplierSku: dto.supplierSku,
    });

    if (existing) {
      // Update prices
      existing.supplierName = dto.supplierName;
      existing.supplierDescription = dto.supplierDescription;
      existing.supplierCategory = dto.supplierCategory;
      existing.basePrice = dto.basePrice;
      existing.discountPercent = dto.discountPercent ?? 0;
      await existing.save();
      return { product: existing, isNew: false };
    }

    const product = await this.supplierProductModel.create({
      ...dto,
      supplierId: new Types.ObjectId(dto.supplierId),
    });
    return { product, isNew: true };
  }

  async findAll(): Promise<SupplierProductDocument[]> {
    return this.supplierProductModel
      .find()
      .populate('supplierId', 'name code')
      .sort({ supplierName: 1 });
  }

  async findBySupplier(supplierId: string): Promise<SupplierProductDocument[]> {
    return this.supplierProductModel
      .find({ supplierId: new Types.ObjectId(supplierId) })
      .sort({ supplierName: 1 });
  }

  async findUnmapped(): Promise<SupplierProductDocument[]> {
    return this.supplierProductModel
      .find({ unifiedProductId: { $exists: false } })
      .populate('supplierId', 'name code')
      .sort({ supplierName: 1 });
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
    return product;
  }

  async findByUnifiedProduct(unifiedProductId: string): Promise<SupplierProductDocument[]> {
    return this.supplierProductModel
      .find({ unifiedProductId: new Types.ObjectId(unifiedProductId) })
      .populate('supplierId', 'name code')
      .sort({ netCost: 1 });
  }
}
