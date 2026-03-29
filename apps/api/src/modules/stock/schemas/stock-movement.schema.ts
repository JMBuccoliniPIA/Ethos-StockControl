import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { MovementType } from '../../../common/constants';

export type StockMovementDocument = HydratedDocument<StockMovement>;

@Schema({ timestamps: true })
export class StockMovement {
  @Prop({ type: Types.ObjectId, ref: 'Product', required: true })
  productId: Types.ObjectId;

  @Prop({ required: true, enum: MovementType })
  type: MovementType;

  @Prop({ required: true, min: 1 })
  quantity: number;

  @Prop({ required: true, trim: true })
  reason: string;

  @Prop({ required: true })
  previousStock: number;

  @Prop({ required: true })
  newStock: number;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  performedBy: Types.ObjectId;
}

export const StockMovementSchema = SchemaFactory.createForClass(StockMovement);
StockMovementSchema.index({ productId: 1, createdAt: -1 });
StockMovementSchema.index({ performedBy: 1 });
StockMovementSchema.index({ createdAt: -1 });
