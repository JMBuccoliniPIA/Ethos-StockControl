import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type SupplierProductDocument = HydratedDocument<SupplierProduct>;

@Schema({ timestamps: true })
export class SupplierProduct {
  @Prop({ type: Types.ObjectId, ref: 'Supplier', required: true })
  supplierId: Types.ObjectId;

  @Prop({ required: true, trim: true })
  supplierSku: string;

  @Prop({ required: true, trim: true })
  supplierName: string;

  @Prop({ trim: true })
  supplierDescription?: string;

  @Prop({ trim: true })
  supplierCategory?: string;

  @Prop({ required: true, default: 0, min: 0 })
  basePrice: number;

  @Prop({ required: true, default: 0, min: 0, max: 100 })
  discountPercent: number;

  @Prop({ required: true, default: 0, min: 0 })
  netCost: number;

  @Prop({ type: Types.ObjectId, ref: 'UnifiedProduct' })
  unifiedProductId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'ImportJob' })
  importJobId?: Types.ObjectId;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ type: Date })
  lastPriceUpdate?: Date;
}

export const SupplierProductSchema = SchemaFactory.createForClass(SupplierProduct);

// Calculate netCost before save
SupplierProductSchema.pre('save', function (next) {
  this.netCost = Math.round(
    this.basePrice * (1 - this.discountPercent / 100) * 100
  ) / 100;
  this.lastPriceUpdate = new Date();
  next();
});

// Indexes
SupplierProductSchema.index({ supplierId: 1, supplierSku: 1 }, { unique: true });
SupplierProductSchema.index({ supplierId: 1 });
SupplierProductSchema.index({ unifiedProductId: 1 });
SupplierProductSchema.index({ supplierName: 'text', supplierSku: 'text' });
