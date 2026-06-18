import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type SupplierDocument = HydratedDocument<Supplier>;

@Schema({ timestamps: true })
export class Supplier {
  @Prop({ required: true, unique: true, trim: true })
  name: string;

  @Prop({ trim: true })
  code?: string;

  @Prop({ trim: true })
  contactName?: string;

  @Prop({ trim: true })
  email?: string;

  @Prop({ trim: true })
  phone?: string;

  @Prop({ trim: true })
  address?: string;

  @Prop({ trim: true })
  notes?: string;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({
    type: String,
    enum: ['mentrau', 'ara', 'electro_lanus', 'grass', 'candil', 'marana'],
  })
  parserKey?:
    | 'mentrau'
    | 'ara'
    | 'electro_lanus'
    | 'grass'
    | 'candil'
    | 'marana';

  @Prop({ type: Types.ObjectId, ref: 'User' })
  createdBy?: Types.ObjectId;
}

export const SupplierSchema = SchemaFactory.createForClass(Supplier);
// name index is created automatically by @Prop({ unique: true })
SupplierSchema.index({ code: 1 });
