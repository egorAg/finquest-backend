import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RecurringService } from './recurring.service';
import { CreateRecurringDto } from './dto/create-recurring.dto';
import { UpdateRecurringDto } from './dto/update-recurring.dto';

@UseGuards(JwtAuthGuard)
@Controller('recurring')
export class RecurringController {
  constructor(private readonly recurringService: RecurringService) {}

  @Get()
  getRecurring(@Request() req: any, @Query('spaceId') spaceId?: string) {
    return this.recurringService.getRecurring(req.user.id, spaceId);
  }

  @Post()
  createRecurring(@Request() req: any, @Body() dto: CreateRecurringDto) {
    return this.recurringService.createRecurring(req.user.id, dto);
  }

  @Patch(':id')
  updateRecurring(@Request() req: any, @Param('id') id: string, @Body() dto: UpdateRecurringDto) {
    return this.recurringService.updateRecurring(req.user.id, id, dto);
  }

  @Delete(':id')
  deleteRecurring(@Request() req: any, @Param('id') id: string) {
    return this.recurringService.deleteRecurring(req.user.id, id);
  }
}
