import { IsDateString, IsIn, IsNumber, IsOptional, IsPositive, IsString } from 'class-validator';

export class CreateRecurringDto {
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

  @IsIn(['DAILY', 'WEEKLY', 'MONTHLY'])
  frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY';

  @IsDateString()
  nextRunDate: string;
}
