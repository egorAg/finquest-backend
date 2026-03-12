import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { XpService } from '../xp/xp.service';
import { UpdateProgressDto } from './dto/update-progress.dto';

@Injectable()
export class ChallengesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly xp: XpService,
  ) {}

  async getChallenges(userId: string) {
    const memberships = await this.prisma.spaceMember.findMany({ where: { userId } });
    const spaceIds = memberships.map((m) => m.spaceId);

    return this.prisma.challenge.findMany({
      where: {
        OR: [{ spaceId: null }, { spaceId: { in: spaceIds } }],
      },
      orderBy: { deadline: 'asc' },
    });
  }

  async updateProgress(userId: string, id: string, dto: UpdateProgressDto) {
    const challenge = await this.prisma.challenge.findUnique({ where: { id } });
    if (!challenge) throw new NotFoundException('Challenge not found');

    const wasCompleted = challenge.isCompleted;
    const nowCompleted = dto.currentValue >= challenge.targetValue;

    const updated = await this.prisma.challenge.update({
      where: { id },
      data: {
        currentValue: dto.currentValue,
        isCompleted: nowCompleted,
        completedAt: nowCompleted && !wasCompleted ? new Date() : challenge.completedAt,
      },
    });

    let xpEarned: number | undefined;
    let user: any;

    if (nowCompleted && !wasCompleted) {
      xpEarned = challenge.xpReward;
      user = await this.xp.addXp(userId, challenge.xpReward);
    }

    return { challenge: updated, xpEarned, user };
  }
}
