import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSpaceDto } from './dto/create-space.dto';
import { AddMemberDto } from './dto/add-member.dto';

@Injectable()
export class SpacesService {
  constructor(private readonly prisma: PrismaService) {}

  async getSpaces(userId: string) {
    return this.prisma.space.findMany({
      where: { members: { some: { userId } } },
      include: { members: { include: { user: true } } },
    });
  }

  async createSpace(userId: string, dto: CreateSpaceDto) {
    const space = await this.prisma.space.create({
      data: {
        name: dto.name,
        emoji: dto.emoji,
        type: dto.type,
        ownerId: userId,
        monthlyBudget: dto.monthlyBudget ?? null,
        color: dto.color ?? '#4ADE80',
      },
    });

    await this.prisma.spaceMember.create({
      data: { spaceId: space.id, userId, role: 'OWNER' },
    });

    return this.prisma.space.findUnique({
      where: { id: space.id },
      include: { members: true },
    });
  }

  async addMember(userId: string, spaceId: string, dto: AddMemberDto) {
    const space = await this.prisma.space.findUnique({ where: { id: spaceId } });
    if (!space) throw new NotFoundException('Space not found');
    if (space.ownerId !== userId) throw new ForbiddenException('Only owner can add members');

    const invitee = await this.prisma.user.findFirst({
      where: { username: dto.telegramUsername },
    });
    if (!invitee) throw new NotFoundException('User not found');

    await this.prisma.spaceMember.upsert({
      where: { spaceId_userId: { spaceId, userId: invitee.id } },
      create: { spaceId, userId: invitee.id, role: 'MEMBER' },
      update: {},
    });

    return this.prisma.space.findUnique({
      where: { id: spaceId },
      include: { members: true },
    });
  }
}
