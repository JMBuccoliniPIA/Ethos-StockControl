import {
  IsEnum,
  IsMongoId,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { ProductStatus } from '../../../common/constants';

export class UpdateUnifiedProductDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsMongoId()
  @IsOptional()
  familyId?: string;

  @IsMongoId()
  @IsOptional()
  subfamilyId?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  stock?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  stockMin?: number;

  @IsMongoId()
  @IsOptional()
  selectedSupplierProductId?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  selectedCost?: number;

  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  profitMarginPercent?: number;

  @IsEnum(ProductStatus)
  @IsOptional()
  status?: ProductStatus;

  @IsString()
  @IsOptional()
  imageUrl?: string;
}
