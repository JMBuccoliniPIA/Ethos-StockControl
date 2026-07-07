import { IsEnum, IsMongoId, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { MovementType } from '../../../common/constants';

export class CreateMovementDto {
  @IsMongoId()
  @IsNotEmpty()
  productId: string;

  @IsEnum(MovementType)
  type: MovementType;

  // 0 is valid for ADJUSTMENT (setting stock to zero). IN/OUT of 0 are no-ops.
  @IsNumber()
  @Min(0)
  quantity: number;

  @IsString()
  @IsNotEmpty()
  reason: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  unitCost?: number;

  @IsString()
  @IsOptional()
  documentNumber?: string;

  @IsMongoId()
  @IsOptional()
  supplierId?: string;

  @IsString()
  @IsOptional()
  location?: string;
}
