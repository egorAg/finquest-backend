import { IsDateString, IsNumber, IsOptional, IsPositive, IsString } from 'class-validator';

export class UpdateGoalDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  currentAmount?: number;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  targetAmount?: number;

  @IsOptional()
  @IsDateString()
  deadline?: string;
}
