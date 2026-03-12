import { IsDateString, IsNumber, IsOptional, IsPositive, IsString } from 'class-validator';

export class CreateGoalDto {
  @IsString()
  spaceId: string;

  @IsString()
  name: string;

  @IsString()
  emoji: string;

  @IsNumber()
  @IsPositive()
  targetAmount: number;

  @IsOptional()
  @IsDateString()
  deadline?: string;

  @IsOptional()
  @IsString()
  color?: string;
}
