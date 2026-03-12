import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { LeaderboardService } from './leaderboard.service';

@UseGuards(JwtAuthGuard)
@Controller('leaderboard')
export class LeaderboardController {
  constructor(private readonly leaderboardService: LeaderboardService) {}

  @Get()
  getLeaderboard(@Query('season') season?: string, @Query('limit') limit?: string) {
    return this.leaderboardService.getLeaderboard(season, limit ? parseInt(limit) : 50);
  }
}
