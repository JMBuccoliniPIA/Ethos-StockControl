import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type SubfamilyDocument = HydratedDocument<Subfamily>;

@Schema({ timestamps: true })
export class Subfamily {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ type: Types.ObjectId, ref: 'Family', required: true })
  familyId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Subfamily', default: null })
  parentId?: Types.ObjectId | null;

  @Prop({ trim: true })
  description?: string;

  @Prop({ default: true })
  isActive: boolean;
}

export const SubfamilySchema = SchemaFactory.createForClass(Subfamily);
// Unique: same name under same parent within the same family
SubfamilySchema.index({ familyId: 1, parentId: 1, name: 1 }, { unique: true });
SubfamilySchema.index({ parentId: 1 });
