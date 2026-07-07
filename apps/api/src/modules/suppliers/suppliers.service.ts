import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Supplier, SupplierDocument } from './schemas/supplier.schema';
import { SupplierProduct, SupplierProductDocument } from '../supplier-products/schemas/supplier-product.schema';
import { StockMovement, StockMovementDocument } from '../stock/schemas/stock-movement.schema';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';

@Injectable()
export class SuppliersService {
  constructor(
    @InjectModel(Supplier.name) private supplierModel: Model<SupplierDocument>,
    @InjectModel(SupplierProduct.name)
    private supplierProductModel: Model<SupplierProductDocument>,
    @InjectModel(StockMovement.name)
    private stockMovementModel: Model<StockMovementDocument>,
  ) {}

  async create(dto: CreateSupplierDto, userId?: string): Promise<SupplierDocument> {
    const existing = await this.supplierModel.findOne({ name: dto.name });
    if (existing) {
      throw new ConflictException('Ya existe un proveedor con ese nombre');
    }

    const data: Partial<Supplier> = { ...dto };
    if (!data.code || !data.code.trim()) {
      data.code = await this.generateNextCode();
    }
    if (userId) {
      data.createdBy = new Types.ObjectId(userId);
    }

    return this.supplierModel.create(data);
  }

  private async generateNextCode(): Promise<string> {
    const count = await this.supplierModel.countDocuments();
    for (let i = count + 1; i < count + 1000; i++) {
      const candidate = `PROV-${String(i).padStart(3, '0')}`;
      const exists = await this.supplierModel.findOne({ code: candidate });
      if (!exists) return candidate;
    }
    return `PROV-${Date.now()}`;
  }

  async findAll(): Promise<SupplierDocument[]> {
    return this.supplierModel.find().sort({ name: 1 });
  }

  async findActive(): Promise<SupplierDocument[]> {
    return this.supplierModel.find({ isActive: true }).sort({ name: 1 });
  }

  async findById(id: string): Promise<SupplierDocument> {
    const supplier = await this.supplierModel.findById(id);
    if (!supplier) throw new NotFoundException('Proveedor no encontrado');
    return supplier;
  }

  async update(id: string, dto: UpdateSupplierDto): Promise<SupplierDocument> {
    if (dto.name) {
      const existing = await this.supplierModel.findOne({
        name: dto.name,
        _id: { $ne: id },
      });
      if (existing) {
        throw new ConflictException('Ya existe un proveedor con ese nombre');
      }
    }
    const supplier = await this.supplierModel.findByIdAndUpdate(id, dto, { new: true });
    if (!supplier) throw new NotFoundException('Proveedor no encontrado');
    return supplier;
  }

  async delete(id: string): Promise<void> {
    const supplierId = new Types.ObjectId(id);

    // Block deletion while the supplier is still referenced, to avoid orphans
    const [productCount, movementCount] = await Promise.all([
      this.supplierProductModel.countDocuments({ supplierId }),
      this.stockMovementModel.countDocuments({ supplierId }),
    ]);

    if (productCount > 0 || movementCount > 0) {
      const refs: string[] = [];
      if (productCount > 0) refs.push(`${productCount} producto(s) de proveedor`);
      if (movementCount > 0) refs.push(`${movementCount} movimiento(s) de stock`);
      throw new BadRequestException(
        `No se puede eliminar el proveedor: tiene ${refs.join(' y ')} asociados. ` +
          'Desactivalo en lugar de eliminarlo.',
      );
    }

    const result = await this.supplierModel.findByIdAndDelete(id);
    if (!result) throw new NotFoundException('Proveedor no encontrado');
  }
}
