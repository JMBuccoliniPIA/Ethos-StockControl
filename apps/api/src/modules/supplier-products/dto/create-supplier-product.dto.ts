import { IsIn, IsMongoId, IsNotEmpty, IsNumber, IsObject, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreateSupplierProductDto {
  @IsMongoId()
  @IsNotEmpty()
  supplierId: string;

  @IsString()
  @IsNotEmpty()
  supplierSku: string;

  @IsString()
  @IsNotEmpty()
  supplierName: string;

  @IsString()
  @IsOptional()
  supplierDescription?: string;

  @IsString()
  @IsOptional()
  supplierCategory?: string;

  @IsString()
  @IsOptional()
  color?: string;

  @IsNumber()
  @Min(0)
  basePrice: number;

  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  discountPercent?: number;

  @IsIn(['ARS', 'USD'])
  @IsOptional()
  currency?: 'ARS' | 'USD';

  @IsObject()
  @IsOptional()
  metadata?: Record<string, string>;
}
