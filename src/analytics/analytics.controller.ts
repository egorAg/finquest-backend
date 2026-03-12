import { Controller, Get, Query, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AnalyticsService } from './analytics.service';

@UseGuards(JwtAuthGuard)
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('summary')
  getSummary(
    @Request() req: any,
    @Query('spaceId') spaceId: string,
    @Query('month') month: string,
  ) {
    return this.analyticsService.getSummary(req.user.id, spaceId, month);
  }
}
