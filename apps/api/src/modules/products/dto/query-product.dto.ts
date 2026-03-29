import { IsEnum, IsMongoId, IsOptional, IsString } from 'class-validator';
import { ProductStatus } from '../../../common/constants';

export class QueryProductDto {
  @IsOptional()
  page?: number;

  @IsOptional()
  limit?: number;

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
  sortBy?: string;

  @IsString()
  @IsOptional()
  sortOrder?: 'asc' | 'desc';
}
