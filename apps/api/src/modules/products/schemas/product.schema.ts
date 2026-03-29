import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { ProductStatus } from '../../../common/constants';

export type ProductDocument = HydratedDocument<Product>;

@Schema({
  timestamps: true,
  toJSON: { virtuals: true },
})
export class Product {
  @Prop({ required: true, unique: true, trim: true, uppercase: true })
  sku: string;

  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ trim: true })
  description?: string;

  @Prop({ type: Types.ObjectId, ref: 'Family', required: true })
  familyId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Subfamily' })
  subfamilyId?: Types.ObjectId;

  @Prop({ required: true, default: 0, min: 0 })
  stock: number;

  @Prop({ required: true, default: 0, min: 0 })
  stockMin: number;

  @Prop({ required: true, default: 0, min: 0 })
  basePrice: number;

  @Prop({ required: true, default: 0, min: 0, max: 100 })
  discountPercent: number;

  @Prop({ required: true, default: 0, min: 0 })
  finalPrice: number;

  @Prop({ required: true, enum: ProductStatus, default: ProductStatus.ACTIVE })
  status: ProductStatus;

  @Prop()
  imageUrl?: string;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  createdBy?: Types.ObjectId;
}

export const ProductSchema = SchemaFactory.createForClass(Product);

// Indexes
ProductSchema.index({ sku: 1 }, { unique: true });
ProductSchema.index({ familyId: 1 });
ProductSchema.index({ subfamilyId: 1 });
ProductSchema.index({ name: 'text', sku: 'text' });
ProductSchema.index({ status: 1 });

// Pre-save: calculate finalPrice
ProductSchema.pre('save', function (next) {
  this.finalPrice = Math.round(
    this.basePrice * (1 - this.discountPercent / 100) * 100,
  ) / 100;
  next();
});
