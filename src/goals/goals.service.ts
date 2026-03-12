import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { XpService } from '../xp/xp.service';
import { BotService } from '../bot/bot.service';
import { CreateGoalDto } from './dto/create-goal.dto';
import { UpdateGoalDto } from './dto/update-goal.dto';

@Injectable()
export class GoalsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly xp: XpService,
    private readonly bot: BotService,
  ) {}

  async getGoals(userId: string, spaceId?: string) {
    const where: any = {};

    if (spaceId) {
      await this.assertMember(userId, spaceId);
      where.spaceId = spaceId;
    } else {
      const memberships = await this.prisma.spaceMember.findMany({ where: { userId } });
      where.spaceId = { in: memberships.map((m) => m.spaceId) };
    }

    return this.prisma.goal.findMany({ where, orderBy: { createdAt: 'desc' } });
  }

  async createGoal(userId: string, dto: CreateGoalDto) {
    await this.assertMember(userId, dto.spaceId);
    return this.prisma.goal.create({
      data: {
        spaceId: dto.spaceId,
        name: dto.name,
        emoji: dto.emoji,
        targetAmount: dto.targetAmount,
        deadline: dto.deadline ? new Date(dto.deadline) : null,
        color: dto.color ?? '#4ADE80',
      },
    });
  }

  async updateGoal(userId: string, id: string, dto: UpdateGoalDto) {
    const goal = await this.prisma.goal.findUnique({ where: { id } });
    if (!goal) throw new NotFoundException('Goal not found');
    await this.assertMember(userId, goal.spaceId);

    const data: any = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.targetAmount !== undefined) data.targetAmount = dto.targetAmount;
    if (dto.deadline !== undefined) data.deadline = new Date(dto.deadline);

    if (dto.currentAmount !== undefined) {
      data.currentAmount = dto.currentAmount;
      // Автозавершение при достижении цели
      if (dto.currentAmount >= goal.targetAmount && !goal.isCompleted) {
        data.isCompleted = true;
        data.completedAt = new Date();
        await this.xp.addXp(userId, 100);

        // Уведомляем всех участников пространства
        const members = await this.prisma.spaceMember.findMany({
          where: { spaceId: goal.spaceId },
          include: { user: true },
        });
        const msg = `🎯 *Цель выполнена!*\n«${goal.name}» ${goal.emoji} накоплена полностью! +100 XP`;
        for (const m of members) {
          await this.bot.sendNotification(m.user.telegramId, msg);
        }
      }
    }

    return this.prisma.goal.update({ where: { id }, data });
  }

  private async assertMember(userId: string, spaceId: string) {
    const member = await this.prisma.spaceMember.findUnique({
      where: { spaceId_userId: { spaceId, userId } },
    });
    if (!member) throw new ForbiddenException('Not a member of this space');
  }
}
