import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async getMe(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      include: {
        achievements: { include: { achievement: true } },
      },
    });
    return this.formatUser(user);
  }

  async updateMe(userId: string, dto: UpdateUserDto) {
    const data: any = {};
    if (dto.firstName !== undefined) data.firstName = dto.firstName;
    if (dto.avatarEmoji !== undefined) data.avatarEmoji = dto.avatarEmoji;
    if (dto.settings) {
      if (dto.settings.currency !== undefined) data.currency = dto.settings.currency;
      if (dto.settings.notifications !== undefined) data.notificationsEnabled = dto.settings.notifications;
      if (dto.settings.theme !== undefined) data.theme = dto.settings.theme;
    }

    const user = await this.prisma.user.update({
      where: { id: userId },
      data,
      include: { achievements: { include: { achievement: true } } },
    });
    return this.formatUser(user);
  }

  private formatUser(user: any) {
    const { achievements, ...rest } = user;
    return {
      ...rest,
      telegramId: rest.telegramId ? Number(rest.telegramId) : null,
      achievements: achievements?.map((ua: any) => ua.achievementId) ?? [],
      settings: {
        currency: rest.currency,
        notifications: rest.notificationsEnabled,
        theme: rest.theme,
      },
    };
  }
}
