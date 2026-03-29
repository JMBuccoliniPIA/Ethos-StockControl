import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Supplier, SupplierDocument } from './schemas/supplier.schema';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';

@Injectable()
export class SuppliersService {
  constructor(
    @InjectModel(Supplier.name) private supplierModel: Model<SupplierDocument>,
  ) {}

  async create(dto: CreateSupplierDto, userId?: string): Promise<SupplierDocument> {
    const existing = await this.supplierModel.findOne({ name: dto.name });
    if (existing) {
      throw new ConflictException('Ya existe un proveedor con ese nombre');
    }

    const data: Partial<Supplier> = { ...dto };
    if (userId) {
      data.createdBy = new Types.ObjectId(userId);
    }

    return this.supplierModel.create(data);
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
    const result = await this.supplierModel.findByIdAndDelete(id);
    if (!result) throw new NotFoundException('Proveedor no encontrado');
  }
}
