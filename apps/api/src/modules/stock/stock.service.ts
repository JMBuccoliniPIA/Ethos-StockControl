import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, FilterQuery } from 'mongoose';
import { StockMovement, StockMovementDocument } from './schemas/stock-movement.schema';
import { CreateMovementDto } from './dto/create-movement.dto';
import { QueryMovementDto } from './dto/query-movement.dto';
import { ProductsService } from '../products/products.service';
import { MovementType } from '../../common/constants';

@Injectable()
export class StockService {
  constructor(
    @InjectModel(StockMovement.name)
    private movementModel: Model<StockMovementDocument>,
    private productsService: ProductsService,
  ) {}

  async createMovement(dto: CreateMovementDto, userId: string) {
    const product = await this.productsService.findById(dto.productId);

    // Calculate stock change
    let quantityDelta: number;
    switch (dto.type) {
      case MovementType.IN:
        quantityDelta = dto.quantity;
        break;
      case MovementType.OUT:
        if (product.stock < dto.quantity) {
          throw new BadRequestException(
            `Stock insuficiente. Disponible: ${product.stock}, solicitado: ${dto.quantity}`,
          );
        }
        quantityDelta = -dto.quantity;
        break;
      case MovementType.ADJUSTMENT:
        // Adjustment sets absolute value — delta is the difference
        quantityDelta = dto.quantity - product.stock;
        break;
      default:
        throw new BadRequestException('Tipo de movimiento inválido');
    }

    const previousStock = product.stock;
    const { newStock } = await this.productsService.adjustStock(
      dto.productId,
      quantityDelta,
    );

    const movement = await this.movementModel.create({
      productId: dto.productId,
      type: dto.type,
      quantity: dto.quantity,
      reason: dto.reason,
      previousStock,
      newStock,
      performedBy: userId,
    });

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
      .sort({ createdAt: -1 })
      .limit(limit);
  }
}
