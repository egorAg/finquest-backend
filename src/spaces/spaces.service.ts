import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSpaceDto } from './dto/create-space.dto';
import { AddMemberDto } from './dto/add-member.dto';
import { UpdateSpaceDto } from './dto/update-space.dto';

@Injectable()
export class SpacesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

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

  async createInvite(userId: string, spaceId: string) {
    const space = await this.prisma.space.findUnique({ where: { id: spaceId } });
    if (!space) throw new NotFoundException('Space not found');
    if (space.type === 'PERSONAL') throw new BadRequestException('Cannot invite to a personal space');

    const member = await this.prisma.spaceMember.findUnique({
      where: { spaceId_userId: { spaceId, userId } },
    });
    if (!member) throw new ForbiddenException('Not a member of this space');

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const invite = await this.prisma.spaceInvite.create({
      data: { spaceId, createdBy: userId, expiresAt },
    });

    const botUsername = this.config.get<string>('BOT_USERNAME') ?? '';
    const inviteUrl = `https://t.me/${botUsername}/finquest?startapp=invite_${invite.token}`;
    return { token: invite.token, expiresAt: invite.expiresAt, inviteUrl };
  }

  async joinByToken(userId: string, token: string) {
    const invite = await this.prisma.spaceInvite.findUnique({
      where: { token },
      include: { space: true },
    });
    if (!invite) throw new NotFoundException('Invite not found or expired');
    if (invite.usedAt) throw new BadRequestException('Invite link has already been used');
    if (invite.expiresAt < new Date()) throw new BadRequestException('Invite link has expired');

    await this.prisma.spaceInvite.update({
      where: { id: invite.id },
      data: { usedAt: new Date() },
    });

    await this.prisma.spaceMember.upsert({
      where: { spaceId_userId: { spaceId: invite.spaceId, userId } },
      create: { spaceId: invite.spaceId, userId, role: 'MEMBER' },
      update: {},
    });

    // Notify the space owner (if they have in-app notifications enabled)
    const joiner = await this.prisma.user.findUnique({ where: { id: userId } });
    const owner = await this.prisma.user.findUnique({ where: { id: invite.space.ownerId } });
    if (joiner && owner && owner.id !== userId) {
      if (owner.notificationsEnabled) {
        await this.prisma.notification.create({
          data: {
            userId: owner.id,
            type: 'NEW_MEMBER',
            title: 'Новый участник',
            text: `${joiner.firstName} вступил(а) в пространство «${invite.space.name}»`,
          },
        });
      }
    }

    return this.prisma.space.findUnique({
      where: { id: invite.spaceId },
      include: { members: true },
    });
  }

  async leaveSpace(userId: string, spaceId: string) {
    const space = await this.prisma.space.findUnique({ where: { id: spaceId } });
    if (!space) throw new NotFoundException('Space not found');
    if (space.ownerId === userId) throw new BadRequestException('Owner cannot leave their own space');

    const member = await this.prisma.spaceMember.findUnique({
      where: { spaceId_userId: { spaceId, userId } },
    });
    if (!member) throw new NotFoundException('Not a member of this space');

    await this.prisma.spaceMember.delete({
      where: { spaceId_userId: { spaceId, userId } },
    });

    return { ok: true };
  }

  async updateSpace(userId: string, spaceId: string, dto: UpdateSpaceDto) {
    const space = await this.prisma.space.findUnique({ where: { id: spaceId } });
    if (!space) throw new NotFoundException('Space not found');
    if (space.ownerId !== userId) throw new ForbiddenException('Only owner can edit this space');

    return this.prisma.space.update({
      where: { id: spaceId },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.emoji !== undefined && { emoji: dto.emoji }),
        ...(dto.monthlyBudget !== undefined && { monthlyBudget: dto.monthlyBudget }),
      },
      include: { members: true },
    });
  }

  async deleteSpace(userId: string, spaceId: string) {
    const space = await this.prisma.space.findUnique({ where: { id: spaceId } });
    if (!space) throw new NotFoundException('Space not found');
    if (space.ownerId !== userId) throw new ForbiddenException('Only owner can delete this space');
    if (space.type === 'PERSONAL') throw new BadRequestException('Cannot delete personal space');

    await this.prisma.space.delete({ where: { id: spaceId } });
    return { ok: true };
  }

  async addMember(userId: string, spaceId: string, dto: AddMemberDto) {
    const space = await this.prisma.space.findUnique({ where: { id: spaceId } });
    if (!space) throw new NotFoundException('Space not found');
    if (space.type === 'PERSONAL') throw new BadRequestException('Cannot add members to a personal space');
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
