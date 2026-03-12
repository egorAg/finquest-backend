import { IsNumber, Min } from 'class-validator';

export class UpdateProgressDto {
  @IsNumber()
  @Min(0)
  currentValue: number;
}
