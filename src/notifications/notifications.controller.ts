import { Controller, Get, Param, Post, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { NotificationsService } from './notifications.service';

@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  getNotifications(@Request() req: any) {
    return this.notificationsService.getNotifications(req.user.id);
  }

  @Post(':id/read')
  markRead(@Request() req: any, @Param('id') id: string) {
    return this.notificationsService.markRead(req.user.id, id);
  }

  @Post('read-all')
  markAllRead(@Request() req: any) {
    return this.notificationsService.markAllRead(req.user.id);
  }
}
