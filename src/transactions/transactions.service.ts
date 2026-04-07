import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { XpService } from '../xp/xp.service';
import { BotService } from '../bot/bot.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { QueryTransactionsDto } from './dto/query-transactions.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';

@Injectable()
export class TransactionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly xp: XpService,
    private readonly bot: BotService,
  ) {}

  async getTransactions(userId: string, query: QueryTransactionsDto) {
    const where: any = {};

    if (query.spaceId) {
      // Проверяем что пользователь состоит в пространстве
      const member = await this.prisma.spaceMember.findUnique({
        where: { spaceId_userId: { spaceId: query.spaceId, userId } },
      });
      if (!member) throw new ForbiddenException('Not a member of this space');
      where.spaceId = query.spaceId;
    } else {
      const memberSpaces = await this.prisma.spaceMember.findMany({ where: { userId } });
      where.spaceId = { in: memberSpaces.map((m) => m.spaceId) };
    }

    if (query.type) where.type = query.type;

    if (query.month) {
      const [year, month] = query.month.split('-').map(Number);
      where.date = {
        gte: new Date(year, month - 1, 1),
        lt: new Date(year, month, 1),
      };
    }

    return this.prisma.transaction.findMany({
      where,
      include: { user: true },
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
      skip: query.offset ?? 0,
      take: query.limit ?? 100,
    });
  }

  async createTransaction(userId: string, dto: CreateTransactionDto) {
    const member = await this.prisma.spaceMember.findUnique({
      where: { spaceId_userId: { spaceId: dto.spaceId, userId } },
    });
    if (!member) throw new ForbiddenException('Not a member of this space');

    const transaction = await this.prisma.transaction.create({
      data: {
        spaceId: dto.spaceId,
        userId,
        type: dto.type,
        amount: dto.amount,
        category: dto.category,
        categoryEmoji: dto.categoryEmoji,
        comment: dto.comment ?? '',
        date: new Date(dto.date),
        xpEarned: 10,
      },
      include: { user: true },
    });

    await this.xp.updateStreak(userId);
    await this.xp.checkFirstTransaction(userId);
    const updatedUser = await this.xp.addXp(userId, 10);

    const space = await this.prisma.space.findUnique({ where: { id: dto.spaceId } });

    // Уведомляем других участников общего пространства
    if (space && space.type !== 'PERSONAL') {
      const members = await this.prisma.spaceMember.findMany({
        where: { spaceId: dto.spaceId, userId: { not: userId } },
        include: { user: true },
      });
      const emoji = dto.type === 'EXPENSE' ? '💸' : '💰';
      const sign = dto.type === 'EXPENSE' ? '-' : '+';
      const action = dto.type === 'EXPENSE' ? 'списал(а)' : 'внёс(ла)';
      const msg = `${emoji} *Новая транзакция* в «${space.name}»\n${transaction.user.firstName} добавил ${sign}${dto.amount} ₽ — ${dto.category}`;
      for (const m of members) {
        if (m.user.telegramId) await this.bot.sendNotification(m.user.telegramId, msg);
        if (m.user.notificationsEnabled) {
          await this.prisma.notification.create({
            data: {
              userId: m.userId,
              type: 'TRANSACTION',
              title: `${emoji} ${dto.category}`,
              text: `${transaction.user.firstName} ${action} ${dto.amount} ₽ в «${space.name}»`,
            },
          });
        }
      }
    }

    // Smart notifications for the user who created the transaction
    if (dto.type === 'EXPENSE' && space) {
      this.checkSmartNotifications(userId, dto.spaceId, space).catch(() => {});
    }

    return { transaction, xpEarned: 10, user: updatedUser };
  }

  private async checkSmartNotifications(
    userId: string,
    spaceId: string,
    space: { monthlyBudget: number | null; name: string },
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { notificationsEnabled: true, telegramId: true },
    });
    if (!user || !user.notificationsEnabled) return;

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    const monthExpenses = await this.prisma.transaction.findMany({
      where: { spaceId, type: 'EXPENSE', date: { gte: monthStart, lt: monthEnd } },
    });

    const totalExpense = monthExpenses.reduce((s, t) => s + t.amount, 0);

    // --- Budget threshold (80% / 100%) ---
    if (space.monthlyBudget && space.monthlyBudget > 0) {
      const pct = totalExpense / space.monthlyBudget;

      if (pct >= 1.0) {
        const existing = await this.prisma.notification.findFirst({
          where: { userId, type: 'BUDGET_WARNING', title: { contains: '100%' }, createdAt: { gte: monthStart } },
        });
        if (!existing) {
          const title = '🚨 100% бюджета потрачено';
          const text = `Потрачено ${Math.round(totalExpense)} из ${Math.round(space.monthlyBudget)} в «${space.name}»`;
          await this.prisma.notification.create({ data: { userId, type: 'BUDGET_WARNING', title, text } });
          if (user.telegramId) await this.bot.sendNotification(user.telegramId, `${title}\n${text}`);
        }
      } else if (pct >= 0.8) {
        const existing = await this.prisma.notification.findFirst({
          where: { userId, type: 'BUDGET_WARNING', title: { contains: '80%' }, createdAt: { gte: monthStart } },
        });
        if (!existing) {
          const title = '⚠️ 80% бюджета потрачено';
          const text = `Потрачено ${Math.round(pct * 100)}% бюджета в «${space.name}», а месяц ещё не кончился`;
          await this.prisma.notification.create({ data: { userId, type: 'BUDGET_WARNING', title, text } });
          if (user.telegramId) await this.bot.sendNotification(user.telegramId, `${title}\n${text}`);
        }
      }
    }

    // --- Today's spending vs daily average ---
    const todayStr = now.toISOString().slice(0, 10);
    const todayTotal = monthExpenses
      .filter((t) => t.date.toISOString().slice(0, 10) === todayStr)
      .reduce((s, t) => s + t.amount, 0);

    const dayOfMonth = now.getDate();
    if (dayOfMonth > 1) {
      const avgDaily = totalExpense / dayOfMonth;
      if (todayTotal > avgDaily * 1.5 && avgDaily > 0) {
        const todayStart = new Date(todayStr);
        const existing = await this.prisma.notification.findFirst({
          where: { userId, type: 'SPENDING_ALERT', createdAt: { gte: todayStart } },
        });
        if (!existing) {
          const title = '📈 Сегодня потратил больше обычного';
          const text = `Сегодня: ${Math.round(todayTotal)} — это больше среднего (${Math.round(avgDaily)}/день)`;
          await this.prisma.notification.create({ data: { userId, type: 'SPENDING_ALERT', title, text } });
          if (user.telegramId) await this.bot.sendNotification(user.telegramId, `${title}\n${text}`);
        }
      }
    }
  }

  async updateTransaction(userId: string, id: string, dto: UpdateTransactionDto) {
    const tx = await this.prisma.transaction.findUnique({ where: { id } });
    if (!tx) throw new NotFoundException('Transaction not found');
    if (tx.userId !== userId) throw new ForbiddenException('Not your transaction');

    return this.prisma.transaction.update({
      where: { id },
      data: {
        ...(dto.amount !== undefined && { amount: dto.amount }),
        ...(dto.category !== undefined && { category: dto.category }),
        ...(dto.categoryEmoji !== undefined && { categoryEmoji: dto.categoryEmoji }),
        ...(dto.comment !== undefined && { comment: dto.comment }),
        ...(dto.date !== undefined && { date: new Date(dto.date) }),
      },
      include: { user: true },
    });
  }

  async deleteTransaction(userId: string, id: string) {
    const tx = await this.prisma.transaction.findUnique({ where: { id } });
    if (!tx) throw new NotFoundException('Transaction not found');
    if (tx.userId !== userId) throw new ForbiddenException('Not your transaction');

    await this.prisma.transaction.delete({ where: { id } });
    return { ok: true };
  }
}
