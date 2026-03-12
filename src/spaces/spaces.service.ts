import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSpaceDto } from './dto/create-space.dto';
import { AddMemberDto } from './dto/add-member.dto';

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
    if (invite.expiresAt < new Date()) throw new BadRequestException('Invite link has expired');

    await this.prisma.spaceMember.upsert({
      where: { spaceId_userId: { spaceId: invite.spaceId, userId } },
      create: { spaceId: invite.spaceId, userId, role: 'MEMBER' },
      update: {},
    });

    // Notify the space owner
    const joiner = await this.prisma.user.findUnique({ where: { id: userId } });
    if (joiner && invite.space.ownerId !== userId) {
      await this.prisma.notification.create({
        data: {
          userId: invite.space.ownerId,
          type: 'NEW_MEMBER',
          title: 'Новый участник',
          text: `${joiner.firstName} вступил(а) в пространство «${invite.space.name}»`,
        },
      });
    }

    return this.prisma.space.findUnique({
      where: { id: invite.spaceId },
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
