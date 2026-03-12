import { IsBoolean, IsIn, IsOptional, IsString } from 'class-validator';

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  avatarEmoji?: string;

  @IsOptional()
  settings?: {
    currency?: string;
    notifications?: boolean;
    theme?: 'dark' | 'light';
  };
}
