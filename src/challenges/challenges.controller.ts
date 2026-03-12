import { Controller, Get, Param, Post, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ChallengesService } from './challenges.service';

@UseGuards(JwtAuthGuard)
@Controller('challenges')
export class ChallengesController {
  constructor(private readonly challengesService: ChallengesService) {}

  @Get()
  getChallenges(@Request() req: any) {
    return this.challengesService.getChallenges(req.user.id);
  }

  @Post(':id/join')
  join(@Request() req: any, @Param('id') id: string) {
    return this.challengesService.join(req.user.id, id);
  }
}
