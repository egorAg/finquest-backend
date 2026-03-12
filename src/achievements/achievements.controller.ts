import { Controller, Get, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AchievementsService } from './achievements.service';

@UseGuards(JwtAuthGuard)
@Controller('achievements')
export class AchievementsController {
  constructor(private readonly achievementsService: AchievementsService) {}

  @Get()
  getAchievements(@Request() req: any) {
    return this.achievementsService.getAchievements(req.user.id);
  }
}
