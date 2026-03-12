import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { createHmac } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { TelegramAuthDto } from './dto/telegram-auth.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly users: UsersService,
  ) {}

  async telegramAuth(dto: TelegramAuthDto) {
    const telegramUser = this.validateInitData(dto.initData);

    let user = await this.prisma.user.findUnique({
      where: { telegramId: BigInt(telegramUser.id) },
    });

    if (!user) {
      user = await this.prisma.user.create({
        data: {
          telegramId: BigInt(telegramUser.id),
          firstName: telegramUser.first_name ?? '',
          lastName: telegramUser.last_name ?? '',
          username: telegramUser.username ?? '',
        },
      });

      // Создаём личное пространство при регистрации
      const space = await this.prisma.space.create({
        data: {
          name: 'Личный',
          emoji: '👤',
          type: 'PERSONAL',
          ownerId: user.id,
          color: '#4ADE80',
        },
      });
      await this.prisma.spaceMember.create({
        data: { spaceId: space.id, userId: user.id, role: 'OWNER' },
      });
    }

    const token = this.jwt.sign({ sub: user.id });
    const fullUser = await this.users.getMe(user.id);
    return { user: fullUser, token };
  }

  private validateInitData(initData: string): Record<string, any> {
    const botToken = process.env.BOT_TOKEN;
    if (!botToken) throw new UnauthorizedException('Bot token not configured');

    const params = new URLSearchParams(initData);
    const hash = params.get('hash');
    if (!hash) throw new UnauthorizedException('Missing hash');

    params.delete('hash');
    const dataCheckString = [...params.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
      .join('\n');

    const secretKey = createHmac('sha256', 'WebAppData').update(botToken).digest();
    const expectedHash = createHmac('sha256', secretKey)
      .update(dataCheckString)
      .digest('hex');

    if (expectedHash !== hash) throw new UnauthorizedException('Invalid hash');

    const userParam = params.get('user');
    if (!userParam) throw new UnauthorizedException('Missing user data');

    return JSON.parse(userParam);
  }

}
