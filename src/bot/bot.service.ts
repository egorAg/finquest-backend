import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectBot } from 'nestjs-telegraf';
import { Telegraf } from 'telegraf';

@Injectable()
export class BotService implements OnModuleInit {
  private readonly logger = new Logger(BotService.name);

  constructor(
    @InjectBot() private readonly bot: Telegraf,
    private readonly config: ConfigService,
  ) {}

  async onModuleInit() {
    const appUrl = this.config.get<string>('APP_URL')!;
    try {
      await this.bot.telegram.setMyCommands([
        { command: 'start', description: 'Открыть FinQuest' },
      ]);
      await this.bot.telegram.setChatMenuButton({
        menuButton: {
          type: 'web_app',
          text: '💰 FinQuest',
          web_app: { url: appUrl },
        },
      });
      this.logger.log('Bot commands and menu button configured');
    } catch (e) {
      this.logger.error(`Failed to configure bot: ${e.message}`);
    }
  }

  async sendNotification(telegramId: bigint, message: string) {
    const appUrl = this.config.get<string>('APP_URL')!;
    try {
      const me = await this.bot.telegram.getMe();
      await this.bot.telegram.sendMessage(String(telegramId), message, {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [[
            { text: '📱 Открыть приложение', url: `https://t.me/${me.username}/finquest` },
          ]],
        },
      } as any);
    } catch (e) {
      this.logger.warn(`Could not send notification to ${telegramId}: ${e.message}`);
    }
  }
}
