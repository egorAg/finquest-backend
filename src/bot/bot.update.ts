import { Command, Start, Update } from 'nestjs-telegraf';
import { ConfigService } from '@nestjs/config';
import { Context } from 'telegraf';
import { PrismaService } from '../prisma/prisma.service';

@Update()
export class BotUpdate {
  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  @Start()
  async onStart(ctx: Context) {
    const botUsername = (await ctx.telegram.getMe()).username;
    const name = ctx.from?.first_name ?? 'друг';

    await ctx.reply(
      `Привет, ${name}! 👋\n\n💰 *FinQuest* — твой личный финансовый трекер с игровыми механиками.\n\nОтслеживай траты, копи на цели и соревнуйся с друзьями!`,
      {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [[
            { text: '🚀 Открыть FinQuest', url: `https://t.me/${botUsername}/finquest` },
          ]],
        },
      } as any,
    );
  }

  @Command('balance')
  async onBalance(ctx: Context) {
    const telegramId = ctx.from?.id;
    if (!telegramId) {
      await ctx.reply('Не удалось определить пользователя.');
      return;
    }

    const user = await this.prisma.user.findUnique({
      where: { telegramId: BigInt(telegramId) },
    });

    if (!user) {
      await ctx.reply('Вы ещё не зарегистрированы в FinQuest. Нажмите /start чтобы начать!');
      return;
    }

    const memberships = await this.prisma.spaceMember.findMany({
      where: { userId: user.id },
      include: { space: true },
    });

    if (memberships.length === 0) {
      await ctx.reply('У вас нет пространств.');
      return;
    }

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const monthName = now.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' });

    const lines: string[] = [`💰 *Баланс за ${monthName}*\n`];

    for (const m of memberships) {
      const transactions = await this.prisma.transaction.findMany({
        where: { spaceId: m.spaceId, date: { gte: monthStart, lt: monthEnd } },
      });

      const income = transactions.filter((t) => t.type === 'INCOME').reduce((s, t) => s + t.amount, 0);
      const expense = transactions.filter((t) => t.type === 'EXPENSE').reduce((s, t) => s + t.amount, 0);
      const balance = income - expense;
      const sign = balance >= 0 ? '+' : '';

      lines.push(`${m.space.emoji} *${m.space.name}*`);
      lines.push(`   📥 Доход: ${Math.round(income)}`);
      lines.push(`   📤 Расход: ${Math.round(expense)}`);
      lines.push(`   💵 Баланс: ${sign}${Math.round(balance)}`);

      if (m.space.monthlyBudget) {
        const pct = Math.round((expense / m.space.monthlyBudget) * 100);
        lines.push(`   📊 Бюджет: ${pct}% использовано`);
      }
      lines.push('');
    }

    await ctx.reply(lines.join('\n'), { parse_mode: 'Markdown' } as any);
  }
}
