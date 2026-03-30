import { IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

// Note: supplierId and supplierSku cannot be updated
export class UpdateSupplierProductDto {
  @IsString()
  @IsOptional()
  supplierName?: string;

  @IsString()
  @IsOptional()
  supplierDescription?: string;

  @IsString()
  @IsOptional()
  supplierCategory?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  basePrice?: number;

  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  discountPercent?: number;
}
