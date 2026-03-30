import { IsEnum, IsMongoId, IsOptional, IsString } from 'class-validator';
import { ProductStatus } from '../../../common/constants';

export class QueryUnifiedProductDto {
  @IsString()
  @IsOptional()
  search?: string;

  @IsMongoId()
  @IsOptional()
  familyId?: string;

  @IsMongoId()
  @IsOptional()
  subfamilyId?: string;

  @IsEnum(ProductStatus)
  @IsOptional()
  status?: ProductStatus;

  @IsString()
  @IsOptional()
  hasSupplier?: 'true' | 'false';

  @IsOptional()
  page?: number;

  @IsOptional()
  limit?: number;
}
