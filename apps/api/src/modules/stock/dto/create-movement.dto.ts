import { IsEnum, IsMongoId, IsNotEmpty, IsNumber, IsString, Min } from 'class-validator';
import { MovementType } from '../../../common/constants';

export class CreateMovementDto {
  @IsMongoId()
  @IsNotEmpty()
  productId: string;

  @IsEnum(MovementType)
  type: MovementType;

  @IsNumber()
  @Min(1)
  quantity: number;

  @IsString()
  @IsNotEmpty()
  reason: string;
}
