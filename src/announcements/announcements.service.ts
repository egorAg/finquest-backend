import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AnnouncementsService {
  constructor(private readonly prisma: PrismaService) {}

  async getActive() {
    return this.prisma.announcement.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(userId: string, text: string, emoji?: string) {
    await this.assertAdmin(userId);
    // Deactivate previous announcements
    await this.prisma.announcement.updateMany({
      where: { isActive: true },
      data: { isActive: false },
    });
    return this.prisma.announcement.create({
      data: { text, emoji: emoji ?? '📢' },
    });
  }

  async deactivate(userId: string, id: string) {
    await this.assertAdmin(userId);
    return this.prisma.announcement.update({
      where: { id },
      data: { isActive: false },
    });
  }

  private async assertAdmin(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    if (!user.isAdmin) throw new ForbiddenException('Admin only');
  }
}
