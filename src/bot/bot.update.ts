import { Start, Update } from 'nestjs-telegraf';
import { ConfigService } from '@nestjs/config';
import { Context, Markup } from 'telegraf';

@Update()
export class BotUpdate {
  constructor(private readonly config: ConfigService) {}

  @Start()
  async onStart(ctx: Context) {
    const appUrl = this.config.get<string>('APP_URL')!;
    const name = ctx.from?.first_name ?? 'друг';

    await ctx.reply(
      `Привет, ${name}! 👋\n\n💰 *FinQuest* — твой личный финансовый трекер с игровыми механиками.\n\nОтслеживай траты, копи на цели и соревнуйся с друзьями!`,
      {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          Markup.button.webApp('🚀 Открыть FinQuest', appUrl),
        ]),
      },
    );
  }
}
