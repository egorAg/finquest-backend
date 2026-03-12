import { IsIn, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateSpaceDto {
  @IsString()
  name: string;

  @IsString()
  emoji: string;

  @IsIn(['PERSONAL', 'FAMILY', 'WORK'])
  type: 'PERSONAL' | 'FAMILY' | 'WORK';

  @IsOptional()
  @IsNumber()
  monthlyBudget?: number;

  @IsOptional()
  @IsString()
  color?: string;
}
