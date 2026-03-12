import { IsOptional, IsString, IsNumber } from 'class-validator';

export class UpdateSpaceDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  emoji?: string;

  @IsOptional()
  @IsNumber()
  monthlyBudget?: number;
}
