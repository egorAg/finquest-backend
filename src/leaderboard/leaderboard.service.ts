import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

// Fixed epoch — first biweekly season starts here
const EPOCH = new Date('2026-01-05T00:00:00.000Z');
const SEASON_DAYS = 14;

export const SEASON_REWARDS = [
  { place: 1, emoji: '🥇', xp: 500, label: '500 XP' },
  { place: 2, emoji: '🥈', xp: 250, label: '250 XP' },
  { place: 3, emoji: '🥉', xp: 100, label: '100 XP' },
];

@Injectable()
export class LeaderboardService {
  constructor(private readonly prisma: PrismaService) {}

  currentSeasonInfo() {
    const now = Date.now();
    const ms = Math.max(0, now - EPOCH.getTime());
    const seasonNumber = Math.floor(ms / (SEASON_DAYS * 86400000));
    const seasonStart = new Date(EPOCH.getTime() + seasonNumber * SEASON_DAYS * 86400000);
    const seasonEnd = new Date(seasonStart.getTime() + SEASON_DAYS * 86400000);
    const daysLeft = Math.ceil((seasonEnd.getTime() - now) / 86400000);
    return { seasonNumber, seasonStart, seasonEnd, daysLeft, rewards: SEASON_REWARDS };
  }

  async getLeaderboard(seasonStart?: string, limit = 50) {
    // All-time leaderboard
    if (!seasonStart) {
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

    // Biweekly season
    const from = new Date(seasonStart);
    const to = new Date(from.getTime() + SEASON_DAYS * 86400000);

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
        if (!u) return null;
        return {
          rank: i + 1,
          user: { id: u.id, firstName: u.firstName, username: u.username, avatarEmoji: u.avatarEmoji, level: u.level },
          xp: g._sum.xpEarned ?? 0,
        };
      })
      .filter(Boolean);
  }
}
