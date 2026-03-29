import { IsEnum, IsMongoId, IsOptional } from 'class-validator';
import { MovementType } from '../../../common/constants';

export class QueryMovementDto {
  @IsMongoId()
  @IsOptional()
  productId?: string;

  @IsEnum(MovementType)
  @IsOptional()
  type?: MovementType;

  @IsOptional()
  page?: number;

  @IsOptional()
  limit?: number;
}
