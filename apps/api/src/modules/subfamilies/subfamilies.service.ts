import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Subfamily, SubfamilyDocument } from './schemas/subfamily.schema';
import { CreateSubfamilyDto } from './dto/create-subfamily.dto';
import { UpdateSubfamilyDto } from './dto/update-subfamily.dto';

export interface SubfamilyTree {
  _id: string;
  name: string;
  familyId: string;
  parentId: string | null;
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  children: SubfamilyTree[];
}

@Injectable()
export class SubfamiliesService {
  constructor(
    @InjectModel(Subfamily.name)
    private subfamilyModel: Model<SubfamilyDocument>,
  ) {}

  async create(dto: CreateSubfamilyDto): Promise<SubfamilyDocument> {
    const existing = await this.subfamilyModel.findOne({
      familyId: dto.familyId,
      parentId: dto.parentId || null,
      name: dto.name,
    });
    if (existing) {
      throw new ConflictException(
        'Ya existe una subfamilia con ese nombre en este nivel',
      );
    }
    return this.subfamilyModel.create({
      ...dto,
      parentId: dto.parentId || null,
    });
  }

  async findByFamily(familyId: string): Promise<SubfamilyDocument[]> {
    return this.subfamilyModel.find({ familyId }).sort({ name: 1 });
  }

  /** Returns a flat list of all subfamilies, with familyId populated */
  async findAll(): Promise<SubfamilyDocument[]> {
    return this.subfamilyModel
      .find()
      .populate('familyId', 'name')
      .sort({ name: 1 });
  }

  /** Returns subfamilies as a nested tree for a given family */
  async findTreeByFamily(familyId: string): Promise<SubfamilyTree[]> {
    const flat = await this.subfamilyModel
      .find({ familyId })
      .sort({ name: 1 })
      .lean();

    return this.buildTree(flat);
  }

  async findById(id: string): Promise<SubfamilyDocument> {
    const sub = await this.subfamilyModel.findById(id).populate('familyId', 'name');
    if (!sub) throw new NotFoundException('Subfamilia no encontrada');
    return sub;
  }

  async findOrCreateByName(
    name: string,
    familyId: string,
    parentId?: string | null,
  ): Promise<SubfamilyDocument> {
    const trimmed = name.trim();
    let sub = await this.subfamilyModel.findOne({
      name: trimmed,
      familyId,
      parentId: parentId || null,
    });
    if (!sub) {
      sub = await this.subfamilyModel.create({
        name: trimmed,
        familyId,
        parentId: parentId || null,
      });
    }
    return sub;
  }

  async update(id: string, dto: UpdateSubfamilyDto): Promise<SubfamilyDocument> {
    const sub = await this.subfamilyModel.findByIdAndUpdate(id, dto, {
      new: true,
    });
    if (!sub) throw new NotFoundException('Subfamilia no encontrada');
    return sub;
  }

  async delete(id: string): Promise<void> {
    // Delete all descendants recursively
    await this.deleteWithDescendants(id);
  }

  async deleteByFamily(familyId: string): Promise<void> {
    await this.subfamilyModel.deleteMany({ familyId });
  }

  // ─── Private helpers ───

  private async deleteWithDescendants(id: string): Promise<void> {
    const children = await this.subfamilyModel.find({ parentId: id });
    for (const child of children) {
      await this.deleteWithDescendants(child._id.toString());
    }
    const result = await this.subfamilyModel.findByIdAndDelete(id);
    if (!result) throw new NotFoundException('Subfamilia no encontrada');
  }

  private buildTree(flat: any[]): SubfamilyTree[] {
    const map = new Map<string, SubfamilyTree>();
    const roots: SubfamilyTree[] = [];

    // Create nodes
    for (const item of flat) {
      map.set(item._id.toString(), {
        _id: item._id.toString(),
        name: item.name,
        familyId: item.familyId.toString(),
        parentId: item.parentId ? item.parentId.toString() : null,
        description: item.description,
        isActive: item.isActive,
        createdAt: item.createdAt?.toISOString?.() ?? item.createdAt,
        updatedAt: item.updatedAt?.toISOString?.() ?? item.updatedAt,
        children: [],
      });
    }

    // Build tree
    for (const node of map.values()) {
      if (node.parentId && map.has(node.parentId)) {
        map.get(node.parentId)!.children.push(node);
      } else {
        roots.push(node);
      }
    }

    return roots;
  }
}
