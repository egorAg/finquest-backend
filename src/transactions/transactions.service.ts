import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { XpService } from '../xp/xp.service';
import { BotService } from '../bot/bot.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { QueryTransactionsDto } from './dto/query-transactions.dto';

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

    // Уведомляем других участников общего пространства
    const space = await this.prisma.space.findUnique({ where: { id: dto.spaceId } });
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
        await this.bot.sendNotification(m.user.telegramId, msg);
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

    return { transaction, xpEarned: 10, user: updatedUser };
  }

  async deleteTransaction(userId: string, id: string) {
    const tx = await this.prisma.transaction.findUnique({ where: { id } });
    if (!tx) throw new NotFoundException('Transaction not found');
    if (tx.userId !== userId) throw new ForbiddenException('Not your transaction');

    await this.prisma.transaction.delete({ where: { id } });
    return { ok: true };
  }
}
