import { IsBoolean, IsIn, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class UserSettingsDto {
  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsBoolean()
  notifications?: boolean;

  @IsOptional()
  @IsBoolean()
  botNotifications?: boolean;

  @IsOptional()
  @IsIn(['dark', 'light'])
  theme?: 'dark' | 'light';
}

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  avatarEmoji?: string;

  @IsOptional()
  @IsBoolean()
  onboardingDone?: boolean;

  @IsOptional()
  @ValidateNested()
  @Type(() => UserSettingsDto)
  settings?: UserSettingsDto;
}
