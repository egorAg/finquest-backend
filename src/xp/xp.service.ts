import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const XP_RULES = {
  ADD_TRANSACTION: 10,
  FIRST_TRANSACTION: 30,
  COMPLETE_GOAL: 100,
  STREAK_7: 70,
  STREAK_30: 300,
} as const;

function xpToNext(level: number) {
  return level * 200;
}

@Injectable()
export class XpService {
  constructor(private readonly prisma: PrismaService) {}

  async addXp(userId: string, amount: number) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });

    let { xp, level, xpToNext: toNext, totalXpEarned } = user;
    xp += amount;
    totalXpEarned += amount;

    while (xp >= toNext) {
      xp -= toNext;
      level += 1;
      toNext = xpToNext(level);
    }

    return this.prisma.user.update({
      where: { id: userId },
      data: { xp, level, xpToNext: toNext, totalXpEarned },
    });
  }

  async updateStreak(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const today = new Date().toISOString().slice(0, 10);
    const lastActive = user.lastActiveDate
      ? user.lastActiveDate.toISOString().slice(0, 10)
      : null;

    if (lastActive === today) return user; // уже обновлено сегодня

    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    const streakDays = lastActive === yesterday ? user.streakDays + 1 : 1;

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { streakDays, lastActiveDate: new Date() },
    });

    // Бонус за серии
    if (streakDays === 7)  await this.addXp(userId, XP_RULES.STREAK_7);
    if (streakDays === 30) await this.addXp(userId, XP_RULES.STREAK_30);

    return updated;
  }

  async checkFirstTransaction(userId: string) {
    const count = await this.prisma.transaction.count({ where: { userId } });
    if (count === 1) await this.addXp(userId, XP_RULES.FIRST_TRANSACTION);
  }
}
