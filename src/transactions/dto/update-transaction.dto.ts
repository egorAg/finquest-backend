import { IsDateString, IsNumber, IsOptional, IsPositive, IsString } from 'class-validator';

export class UpdateTransactionDto {
  @IsOptional()
  @IsNumber()
  @IsPositive()
  amount?: number;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  categoryEmoji?: string;

  @IsOptional()
  @IsString()
  comment?: string;

  @IsOptional()
  @IsDateString()
  date?: string;
}
