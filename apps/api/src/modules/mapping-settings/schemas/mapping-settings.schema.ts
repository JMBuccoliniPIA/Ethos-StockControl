import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type MappingSettingsDocument = HydratedDocument<MappingSettings>;

export type AutoMapStrategy = 'exact_sku' | 'similar_name' | 'disabled';

@Schema({ timestamps: true })
export class MappingSettings {
  @Prop({ required: true, unique: true, default: 'default' })
  key: string;

  @Prop({ required: true, default: true })
  autoMapOnImport: boolean;

  @Prop({
    required: true,
    default: 'exact_sku',
    enum: ['exact_sku', 'similar_name', 'disabled'],
  })
  autoMapStrategy: AutoMapStrategy;

  @Prop({ required: true, default: 30, min: 0, max: 100 })
  defaultProfitMargin: number;

  @Prop({ required: true, default: 70, min: 0, max: 100 })
  minMatchScore: number;

  @Prop({ required: true, default: true })
  createUnifiedIfNoMatch: boolean;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  updatedBy?: Types.ObjectId;
}

export const MappingSettingsSchema = SchemaFactory.createForClass(MappingSettings);
