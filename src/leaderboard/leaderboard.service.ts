import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class LeaderboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getLeaderboard(season?: string, limit = 50) {
    // Если season не указан — рейтинг по totalXpEarned за всё время
    // Если season указан (YYYY-MM) — считаем XP из транзакций за месяц
    if (!season) {
      const users = await this.prisma.user.findMany({
        orderBy: { totalXpEarned: 'desc' },
        take: limit,
      });
      return users.map((u, i) => ({
        rank: i + 1,
        user: { id: u.id, firstName: u.firstName, username: u.username, avatarEmoji: u.avatarEmoji, level: u.level },
        xp: u.totalXpEarned,
      }));
    }

    const [year, month] = season.split('-').map(Number);
    const from = new Date(year, month - 1, 1);
    const to = new Date(year, month, 1);

    // Агрегируем xpEarned по транзакциям за месяц
    const grouped = await this.prisma.transaction.groupBy({
      by: ['userId'],
      where: { date: { gte: from, lt: to } },
      _sum: { xpEarned: true },
      orderBy: { _sum: { xpEarned: 'desc' } },
      take: limit,
    });

    const userIds = grouped.map((g) => g.userId);
    const users = await this.prisma.user.findMany({ where: { id: { in: userIds } } });
    const userMap = new Map(users.map((u) => [u.id, u]));

    return grouped
      .map((g, i) => {
        const u = userMap.get(g.userId)!;
        return {
          rank: i + 1,
          user: { id: u.id, firstName: u.firstName, username: u.username, avatarEmoji: u.avatarEmoji, level: u.level },
          xp: g._sum.xpEarned ?? 0,
        };
      })
      .filter((e) => e.user);
  }
}
