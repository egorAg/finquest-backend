import { Body, Controller, Delete, Get, Param, Post, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AnnouncementsService } from './announcements.service';

@Controller('announcements')
export class AnnouncementsController {
  constructor(private readonly announcementsService: AnnouncementsService) {}

  @Get('active')
  @UseGuards(JwtAuthGuard)
  getActive() {
    return this.announcementsService.getActive();
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@Request() req: any, @Body() body: { text: string; emoji?: string }) {
    return this.announcementsService.create(req.user.id, body.text, body.emoji);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  deactivate(@Request() req: any, @Param('id') id: string) {
    return this.announcementsService.deactivate(req.user.id, id);
  }
}
