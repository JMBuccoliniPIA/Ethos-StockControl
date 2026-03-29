import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Family, FamilyDocument } from './schemas/family.schema';
import { CreateFamilyDto } from './dto/create-family.dto';
import { UpdateFamilyDto } from './dto/update-family.dto';

@Injectable()
export class FamiliesService {
  constructor(
    @InjectModel(Family.name) private familyModel: Model<FamilyDocument>,
  ) {}

  async create(dto: CreateFamilyDto): Promise<FamilyDocument> {
    const existing = await this.familyModel.findOne({ name: dto.name });
    if (existing) {
      throw new ConflictException('Ya existe una familia con ese nombre');
    }
    return this.familyModel.create(dto);
  }

  async findAll(): Promise<FamilyDocument[]> {
    return this.familyModel.find().sort({ name: 1 });
  }

  async findById(id: string): Promise<FamilyDocument> {
    const family = await this.familyModel.findById(id);
    if (!family) throw new NotFoundException('Familia no encontrada');
    return family;
  }

  async findOrCreateByName(name: string): Promise<FamilyDocument> {
    const trimmed = name.trim();
    let family = await this.familyModel.findOne({ name: trimmed });
    if (!family) {
      family = await this.familyModel.create({ name: trimmed });
    }
    return family;
  }

  async update(id: string, dto: UpdateFamilyDto): Promise<FamilyDocument> {
    if (dto.name) {
      const existing = await this.familyModel.findOne({
        name: dto.name,
        _id: { $ne: id },
      });
      if (existing) {
        throw new ConflictException('Ya existe una familia con ese nombre');
      }
    }
    const family = await this.familyModel.findByIdAndUpdate(id, dto, { new: true });
    if (!family) throw new NotFoundException('Familia no encontrada');
    return family;
  }

  async delete(id: string): Promise<void> {
    const result = await this.familyModel.findByIdAndDelete(id);
    if (!result) throw new NotFoundException('Familia no encontrada');
  }
}
