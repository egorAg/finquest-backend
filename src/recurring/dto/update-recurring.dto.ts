import { IsBoolean, IsDateString, IsIn, IsNumber, IsOptional, IsPositive, IsString } from 'class-validator';

export class UpdateRecurringDto {
  @IsOptional() @IsNumber() @IsPositive()
  amount?: number;

  @IsOptional() @IsString()
  category?: string;

  @IsOptional() @IsString()
  categoryEmoji?: string;

  @IsOptional() @IsString()
  comment?: string;

  @IsOptional() @IsIn(['DAILY', 'WEEKLY', 'MONTHLY'])
  frequency?: 'DAILY' | 'WEEKLY' | 'MONTHLY';

  @IsOptional() @IsBoolean()
  isActive?: boolean;

  @IsOptional() @IsDateString()
  nextRunDate?: string;
}
