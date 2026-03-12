import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { XpService } from '../xp/xp.service';

@Injectable()
export class ChallengesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly xp: XpService,
  ) {}

  async getChallenges(userId: string) {
    const memberships = await this.prisma.spaceMember.findMany({ where: { userId } });
    const spaceIds = memberships.map((m) => m.spaceId);

    const challenges = await this.prisma.challenge.findMany({
      where: {
        OR: [{ spaceId: null }, { spaceId: { in: spaceIds } }],
      },
      include: { userChallenges: { where: { userId } } },
      orderBy: { deadline: 'asc' },
    });

    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    return Promise.all(
      challenges.map(async (ch) => {
        const uc = ch.userChallenges[0];
        if (!uc) {
          return { ...ch, joined: false, currentValue: 0, isCompleted: false, isFailed: false, joinedAt: null };
        }

        const progress = await this.computeProgress(ch, uc, userId, user!);

        // Persist if anything changed
        if (
          progress.currentValue !== uc.currentValue ||
          progress.isCompleted !== uc.isCompleted ||
          progress.isFailed !== uc.isFailed
        ) {
          const wasCompleted = uc.isCompleted;
          await this.prisma.userChallenge.update({
            where: { id: uc.id },
            data: {
              currentValue: progress.currentValue,
              isCompleted: progress.isCompleted,
              isFailed: progress.isFailed,
              completedAt: progress.isCompleted && !wasCompleted ? new Date() : uc.completedAt,
              failedAt: progress.isFailed && !uc.isFailed ? new Date() : uc.failedAt,
            },
          });

          if (progress.isCompleted && !wasCompleted) {
            await this.xp.addXp(userId, ch.xpReward);
          }
        }

        return {
          ...ch,
          joined: true,
          currentValue: progress.currentValue,
          isCompleted: progress.isCompleted,
          isFailed: progress.isFailed,
          completedAt: uc.completedAt,
          joinedAt: uc.joinedAt,
        };
      }),
    );
  }

  async join(userId: string, challengeId: string) {
    const challenge = await this.prisma.challenge.findUnique({ where: { id: challengeId } });
    if (!challenge) throw new NotFoundException('Challenge not found');

    const existing = await this.prisma.userChallenge.findUnique({
      where: { userId_challengeId: { userId, challengeId } },
    });
    if (existing) throw new ConflictException('Already joined');

    return this.prisma.userChallenge.create({ data: { userId, challengeId } });
  }

  private async computeProgress(ch: any, uc: any, userId: string, user: any) {
    switch (ch.type) {
      case 'STREAK': {
        return {
          currentValue: user.streakDays,
          isCompleted: user.streakDays >= ch.targetValue,
          isFailed: false,
        };
      }

      case 'SPENDING_LIMIT': {
        const sum = await this.sumTransactions(userId, 'EXPENSE', ch);
        const deadlinePassed = new Date(ch.deadline) < new Date();
        return {
          currentValue: sum,
          isCompleted: !uc.isFailed && deadlinePassed && sum <= ch.targetValue,
          isFailed: sum > ch.targetValue,
        };
      }

      case 'MIN_SPENDING': {
        const sum = await this.sumTransactions(userId, 'EXPENSE', ch);
        return {
          currentValue: sum,
          isCompleted: sum >= ch.targetValue,
          isFailed: false,
        };
      }

      case 'CATEGORY_AVOID': {
        if (uc.isFailed) return { currentValue: 0, isCompleted: false, isFailed: true };

        const violation = await this.prisma.transaction.findFirst({
          where: {
            userId,
            type: 'EXPENSE',
            date: { gte: new Date(uc.joinedAt) },
            category: { contains: ch.categoryKey ?? '', mode: 'insensitive' },
          },
        });

        if (violation) return { currentValue: 0, isCompleted: false, isFailed: true };

        const daysSince = Math.floor((Date.now() - new Date(uc.joinedAt).getTime()) / 86400000);
        return {
          currentValue: daysSince,
          isCompleted: daysSince >= ch.targetValue,
          isFailed: false,
        };
      }

      case 'GOAL_COMPLETE': {
        const memberships = await this.prisma.spaceMember.findMany({ where: { userId } });
        const count = await this.prisma.goal.count({
          where: {
            spaceId: { in: memberships.map((m) => m.spaceId) },
            isCompleted: true,
          },
        });
        return {
          currentValue: count,
          isCompleted: count >= ch.targetValue,
          isFailed: false,
        };
      }

      default:
        return { currentValue: uc.currentValue, isCompleted: uc.isCompleted, isFailed: uc.isFailed };
    }
  }

  private async sumTransactions(userId: string, type: 'EXPENSE' | 'INCOME', ch: any) {
    const periodStart = this.getPeriodStart(ch);
    const agg = await this.prisma.transaction.aggregate({
      where: {
        userId,
        type,
        date: { gte: periodStart },
        ...(ch.categoryKey
          ? { category: { contains: ch.categoryKey, mode: 'insensitive' } }
          : {}),
      },
      _sum: { amount: true },
    });
    return agg._sum.amount ?? 0;
  }

  private getPeriodStart(ch: any): Date {
    const now = new Date();
    if (ch.periodType === 'MONTH') return new Date(now.getFullYear(), now.getMonth(), 1);
    if (ch.periodType === 'WEEK') {
      const d = new Date(now);
      d.setDate(d.getDate() - d.getDay());
      d.setHours(0, 0, 0, 0);
      return d;
    }
    if (ch.periodType === 'DAYS' && ch.periodDays) {
      const d = new Date(now);
      d.setDate(d.getDate() - ch.periodDays);
      return d;
    }
    return new Date(0); // all time
  }
}
