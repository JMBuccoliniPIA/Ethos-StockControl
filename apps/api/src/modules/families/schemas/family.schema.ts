import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type FamilyDocument = HydratedDocument<Family>;

@Schema({ timestamps: true })
export class Family {
  @Prop({ required: true, unique: true, trim: true })
  name: string;

  @Prop({ trim: true })
  description?: string;

  @Prop({ default: true })
  isActive: boolean;
}

export const FamilySchema = SchemaFactory.createForClass(Family);
FamilySchema.index({ name: 1 });
