import {
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  Max,
  Min,
} from 'class-validator';

export class UpdateMappingSettingsDto {
  @IsBoolean()
  @IsOptional()
  autoMapOnImport?: boolean;

  @IsEnum(['exact_sku', 'similar_name', 'disabled'])
  @IsOptional()
  autoMapStrategy?: 'exact_sku' | 'similar_name' | 'disabled';

  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  defaultProfitMargin?: number;

  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  minMatchScore?: number;

  @IsBoolean()
  @IsOptional()
  createUnifiedIfNoMatch?: boolean;
}
