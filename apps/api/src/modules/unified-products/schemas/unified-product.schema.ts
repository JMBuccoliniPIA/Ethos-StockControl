import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { ProductStatus } from '../../../common/constants';

export type UnifiedProductDocument = HydratedDocument<UnifiedProduct>;

@Schema({
  timestamps: true,
  toJSON: { virtuals: true },
})
export class UnifiedProduct {
  @Prop({ required: true, unique: true, trim: true, uppercase: true })
  sku: string;

  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ trim: true })
  description?: string;

  @Prop({ type: Types.ObjectId, ref: 'Family' })
  familyId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Subfamily' })
  subfamilyId?: Types.ObjectId;

  @Prop({ required: true, default: 0, min: 0 })
  stock: number;

  @Prop({ required: true, default: 0, min: 0 })
  stockMin: number;

  // Selected supplier product for pricing
  @Prop({ type: Types.ObjectId, ref: 'SupplierProduct' })
  selectedSupplierProductId?: Types.ObjectId;

  // Cost from selected supplier (cached for performance)
  @Prop({ required: true, default: 0, min: 0 })
  selectedCost: number;

  // Profit margin percentage
  @Prop({ required: true, default: 30, min: 0, max: 100 })
  profitMarginPercent: number;

  // Calculated sale price: selectedCost * (1 + profitMarginPercent/100)
  @Prop({ required: true, default: 0, min: 0 })
  salePrice: number;

  @Prop({ required: true, enum: ProductStatus, default: ProductStatus.ACTIVE })
  status: ProductStatus;

  @Prop()
  imageUrl?: string;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  createdBy?: Types.ObjectId;
}

export const UnifiedProductSchema = SchemaFactory.createForClass(UnifiedProduct);

// Indexes
UnifiedProductSchema.index({ sku: 1 }, { unique: true });
UnifiedProductSchema.index({ familyId: 1 });
UnifiedProductSchema.index({ subfamilyId: 1 });
UnifiedProductSchema.index({ selectedSupplierProductId: 1 });
UnifiedProductSchema.index({ name: 'text', sku: 'text' });
UnifiedProductSchema.index({ status: 1 });

// Pre-save: calculate salePrice
UnifiedProductSchema.pre('save', function (next) {
  this.salePrice = Math.round(
    this.selectedCost * (1 + this.profitMarginPercent / 100) * 100
  ) / 100;
  next();
});
