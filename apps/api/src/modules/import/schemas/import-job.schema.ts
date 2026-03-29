import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { ImportStatus } from '../../../common/constants';

export type ImportJobDocument = HydratedDocument<ImportJob>;

@Schema({ timestamps: true })
export class ImportJob {
  @Prop({ required: true })
  fileName: string;

  @Prop({ required: true })
  originalName: string;

  @Prop({ required: true, enum: ImportStatus, default: ImportStatus.PENDING })
  status: ImportStatus;

  @Prop({ default: 0 })
  totalRows: number;

  @Prop({ default: 0 })
  validRows: number;

  @Prop({ default: 0 })
  errorRows: number;

  @Prop({ default: 0 })
  duplicateRows: number;

  @Prop({ type: Object, default: {} })
  columnMapping: Record<string, string>;

  @Prop({ type: Array, default: [] })
  previewData: Array<{
    rowNumber: number;
    data: Record<string, unknown>;
    status: string;
    errors?: string[];
  }>;

  @Prop({ type: Array, default: [] })
  errors: Array<{ row: number; message: string }>;

  @Prop({ type: Object })
  result?: {
    productsCreated: number;
    familiesCreated: number;
    subfamiliesCreated: number;
    stockMovements: number;
  };

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  uploadedBy: Types.ObjectId;

  @Prop()
  completedAt?: Date;
}

export const ImportJobSchema = SchemaFactory.createForClass(ImportJob);
ImportJobSchema.index({ uploadedBy: 1, createdAt: -1 });
