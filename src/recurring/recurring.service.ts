import { ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { XpService } from '../xp/xp.service';
import { BotService } from '../bot/bot.service';
import { CreateRecurringDto } from './dto/create-recurring.dto';
import { UpdateRecurringDto } from './dto/update-recurring.dto';

@Injectable()
export class RecurringService {
  private readonly logger = new Logger(RecurringService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly xp: XpService,
    private readonly bot: BotService,
  ) {}

  async getRecurring(userId: string, spaceId?: string) {
    const where: any = { userId };
    if (spaceId) {
      const member = await this.prisma.spaceMember.findUnique({
        where: { spaceId_userId: { spaceId, userId } },
      });
      if (!member) throw new ForbiddenException('Not a member');
      where.spaceId = spaceId;
    }
    return this.prisma.recurringTransaction.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  async createRecurring(userId: string, dto: CreateRecurringDto) {
    const member = await this.prisma.spaceMember.findUnique({
      where: { spaceId_userId: { spaceId: dto.spaceId, userId } },
    });
    if (!member) throw new ForbiddenException('Not a member');

    return this.prisma.recurringTransaction.create({
      data: {
        spaceId: dto.spaceId,
        userId,
        type: dto.type,
        amount: dto.amount,
        category: dto.category,
        categoryEmoji: dto.categoryEmoji,
        comment: dto.comment ?? '',
        frequency: dto.frequency,
        nextRunDate: new Date(dto.nextRunDate),
      },
    });
  }

  async updateRecurring(userId: string, id: string, dto: UpdateRecurringDto) {
    const rec = await this.prisma.recurringTransaction.findUnique({ where: { id } });
    if (!rec) throw new NotFoundException('Not found');
    if (rec.userId !== userId) throw new ForbiddenException('Not yours');

    const data: any = {};
    if (dto.amount !== undefined) data.amount = dto.amount;
    if (dto.category !== undefined) data.category = dto.category;
    if (dto.categoryEmoji !== undefined) data.categoryEmoji = dto.categoryEmoji;
    if (dto.comment !== undefined) data.comment = dto.comment;
    if (dto.frequency !== undefined) data.frequency = dto.frequency;
    if (dto.isActive !== undefined) data.isActive = dto.isActive;
    if (dto.nextRunDate !== undefined) data.nextRunDate = new Date(dto.nextRunDate);

    return this.prisma.recurringTransaction.update({ where: { id }, data });
  }

  async deleteRecurring(userId: string, id: string) {
    const rec = await this.prisma.recurringTransaction.findUnique({ where: { id } });
    if (!rec) throw new NotFoundException('Not found');
    if (rec.userId !== userId) throw new ForbiddenException('Not yours');
    await this.prisma.recurringTransaction.delete({ where: { id } });
    return { ok: true };
  }

  @Cron('0 * * * *')
  async processRecurring() {
    const now = new Date();
    const due = await this.prisma.recurringTransaction.findMany({
      where: { isActive: true, nextRunDate: { lte: now } },
      include: { user: true, space: true },
    });

    if (due.length === 0) return;
    this.logger.log(`Processing ${due.length} recurring transactions`);

    for (const rec of due) {
      try {
        await this.prisma.transaction.create({
          data: {
            spaceId: rec.spaceId,
            userId: rec.userId,
            type: rec.type,
            amount: rec.amount,
            category: rec.category,
            categoryEmoji: rec.categoryEmoji,
            comment: rec.comment ? `🔄 ${rec.comment}` : '🔄 Автоплатёж',
            date: now,
            xpEarned: 10,
          },
        });

        await this.xp.updateStreak(rec.userId);
        await this.xp.addXp(rec.userId, 10);

        // Advance nextRunDate
        const next = new Date(rec.nextRunDate);
        switch (rec.frequency) {
          case 'DAILY':   next.setDate(next.getDate() + 1); break;
          case 'WEEKLY':  next.setDate(next.getDate() + 7); break;
          case 'MONTHLY': next.setMonth(next.getMonth() + 1); break;
        }

        await this.prisma.recurringTransaction.update({
          where: { id: rec.id },
          data: { nextRunDate: next },
        });

        if (rec.user.telegramId) {
          const emoji = rec.type === 'EXPENSE' ? '💸' : '💰';
          await this.bot.sendNotification(
            rec.user.telegramId,
            `🔄 *Автоплатёж*\n${emoji} ${rec.category} — ${rec.amount}`,
          );
        }
      } catch (e) {
        this.logger.error(`Failed to process recurring ${rec.id}: ${e.message}`);
      }
    }
  }
}
