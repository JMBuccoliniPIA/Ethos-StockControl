import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, FilterQuery } from 'mongoose';
import { Product, ProductDocument } from './schemas/product.schema';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { QueryProductDto } from './dto/query-product.dto';

@Injectable()
export class ProductsService {
  constructor(
    @InjectModel(Product.name) private productModel: Model<ProductDocument>,
  ) {}

  async create(
    dto: CreateProductDto,
    userId?: string,
  ): Promise<ProductDocument> {
    const existing = await this.productModel.findOne({ sku: dto.sku.toUpperCase() });
    if (existing) {
      throw new ConflictException(`Ya existe un producto con SKU "${dto.sku}"`);
    }

    const product = new this.productModel({
      ...dto,
      sku: dto.sku.toUpperCase(),
      createdBy: userId,
    });
    return product.save(); // triggers pre-save hook for finalPrice
  }

  async findAll(query: QueryProductDto) {
    const {
      page = 1,
      limit = 20,
      search,
      familyId,
      subfamilyId,
      status,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;

    const filter: FilterQuery<Product> = {};

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { sku: { $regex: search, $options: 'i' } },
      ];
    }
    if (familyId) filter.familyId = familyId;
    if (subfamilyId) filter.subfamilyId = subfamilyId;
    if (status) filter.status = status;

    const skip = (page - 1) * limit;
    const sort: Record<string, 1 | -1> = {
      [sortBy]: sortOrder === 'asc' ? 1 : -1,
    };

    const [data, total] = await Promise.all([
      this.productModel
        .find(filter)
        .populate('familyId', 'name')
        .populate('subfamilyId', 'name')
        .sort(sort)
        .skip(skip)
        .limit(limit),
      this.productModel.countDocuments(filter),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findById(id: string): Promise<ProductDocument> {
    const product = await this.productModel
      .findById(id)
      .populate('familyId', 'name')
      .populate('subfamilyId', 'name')
      .populate('createdBy', 'firstName lastName');
    if (!product) throw new NotFoundException('Producto no encontrado');
    return product;
  }

  async findBySku(sku: string): Promise<ProductDocument | null> {
    return this.productModel.findOne({ sku: sku.toUpperCase() });
  }

  async update(id: string, dto: UpdateProductDto): Promise<ProductDocument> {
    const product = await this.productModel.findById(id);
    if (!product) throw new NotFoundException('Producto no encontrado');

    Object.assign(product, dto);
    return product.save(); // triggers pre-save hook for finalPrice
  }

  async delete(id: string): Promise<void> {
    const result = await this.productModel.findByIdAndDelete(id);
    if (!result) throw new NotFoundException('Producto no encontrado');
  }

  async adjustStock(
    id: string,
    quantity: number,
  ): Promise<{ previousStock: number; newStock: number }> {
    const product = await this.productModel.findById(id);
    if (!product) throw new NotFoundException('Producto no encontrado');

    const previousStock = product.stock;
    product.stock = Math.max(0, product.stock + quantity);
    await product.save();

    return { previousStock, newStock: product.stock };
  }

  async getStats() {
    const [total, active, lowStock, outOfStock, totalValue] = await Promise.all([
      this.productModel.countDocuments(),
      this.productModel.countDocuments({ status: 'active' }),
      this.productModel.countDocuments({
        $expr: { $and: [{ $lte: ['$stock', '$stockMin'] }, { $gt: ['$stock', 0] }] },
      }),
      this.productModel.countDocuments({ stock: 0 }),
      this.productModel.aggregate([
        { $match: { status: 'active' } },
        { $group: { _id: null, total: { $sum: { $multiply: ['$stock', '$finalPrice'] } } } },
      ]),
    ]);

    return {
      totalProducts: total,
      activeProducts: active,
      lowStockCount: lowStock,
      outOfStockCount: outOfStock,
      totalStockValue: totalValue[0]?.total ?? 0,
    };
  }

  async getLowStockProducts(): Promise<ProductDocument[]> {
    return this.productModel
      .find({ $expr: { $lte: ['$stock', '$stockMin'] } })
      .populate('familyId', 'name')
      .sort({ stock: 1 });
  }
}
