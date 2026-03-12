import { Body, Controller, Get, Param, Patch, Post, Query, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { GoalsService } from './goals.service';
import { CreateGoalDto } from './dto/create-goal.dto';
import { UpdateGoalDto } from './dto/update-goal.dto';

@UseGuards(JwtAuthGuard)
@Controller('goals')
export class GoalsController {
  constructor(private readonly goalsService: GoalsService) {}

  @Get()
  getGoals(@Request() req: any, @Query('spaceId') spaceId?: string) {
    return this.goalsService.getGoals(req.user.id, spaceId);
  }

  @Post()
  createGoal(@Request() req: any, @Body() dto: CreateGoalDto) {
    return this.goalsService.createGoal(req.user.id, dto);
  }

  @Patch(':id')
  updateGoal(@Request() req: any, @Param('id') id: string, @Body() dto: UpdateGoalDto) {
    return this.goalsService.updateGoal(req.user.id, id, dto);
  }
}
