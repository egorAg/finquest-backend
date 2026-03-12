import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AchievementsService {
  constructor(private readonly prisma: PrismaService) {}

  async getAchievements(userId: string) {
    const all = await this.prisma.achievement.findMany();
    const unlocked = await this.prisma.userAchievement.findMany({
      where: { userId },
    });
    const unlockedMap = new Map(unlocked.map((ua) => [ua.achievementId, ua.unlockedAt]));

    return all.map((a) => ({
      ...a,
      isUnlocked: unlockedMap.has(a.id),
      unlockedAt: unlockedMap.get(a.id) ?? null,
    }));
  }
}
