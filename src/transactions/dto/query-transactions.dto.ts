import { IsIn, IsNumberString, IsOptional, IsString, Matches } from 'class-validator';
import { Type } from 'class-transformer';

export class QueryTransactionsDto {
  @IsOptional()
  @IsString()
  spaceId?: string;

  @IsOptional()
  @Matches(/^\d{4}-\d{2}$/)
  month?: string; // YYYY-MM

  @IsOptional()
  @IsIn(['EXPENSE', 'INCOME'])
  type?: 'EXPENSE' | 'INCOME';

  @IsOptional()
  @Type(() => Number)
  limit?: number;

  @IsOptional()
  @Type(() => Number)
  offset?: number;
}
