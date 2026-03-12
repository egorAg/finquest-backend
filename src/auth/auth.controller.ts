import { Body, Controller, Logger, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { TelegramAuthDto } from './dto/telegram-auth.dto';

@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(private readonly authService: AuthService) {}

  @Post('telegram')
  async telegramAuth(@Body() dto: TelegramAuthDto) {
    this.logger.log(`Auth attempt, initData length: ${dto.initData?.length ?? 0}`);
    try {
      const result = await this.authService.telegramAuth(dto);
      this.logger.log(`Auth success for user: ${result.user?.telegramId}`);
      return result;
    } catch (e) {
      this.logger.error(`Auth failed: ${e.message}`);
      throw e;
    }
  }
}
