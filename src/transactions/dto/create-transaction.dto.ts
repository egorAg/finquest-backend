import { IsDateString, IsIn, IsNumber, IsOptional, IsPositive, IsString } from 'class-validator';

export class CreateTransactionDto {
  @IsString()
  spaceId: string;

  @IsIn(['EXPENSE', 'INCOME'])
  type: 'EXPENSE' | 'INCOME';

  @IsNumber()
  @IsPositive()
  amount: number;

  @IsString()
  category: string;

  @IsString()
  categoryEmoji: string;

  @IsOptional()
  @IsString()
  comment?: string;

  @IsDateString()
  date: string;
}
