import { Body, Controller, Get, Param, Post, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ChallengesService } from './challenges.service';
import { UpdateProgressDto } from './dto/update-progress.dto';

@UseGuards(JwtAuthGuard)
@Controller('challenges')
export class ChallengesController {
  constructor(private readonly challengesService: ChallengesService) {}

  @Get()
  getChallenges(@Request() req: any) {
    return this.challengesService.getChallenges(req.user.id);
  }

  @Post(':id/progress')
  updateProgress(@Request() req: any, @Param('id') id: string, @Body() dto: UpdateProgressDto) {
    return this.challengesService.updateProgress(req.user.id, id, dto);
  }
}
