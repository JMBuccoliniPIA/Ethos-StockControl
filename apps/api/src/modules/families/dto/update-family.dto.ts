import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class UpdateFamilyDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
