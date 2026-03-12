import { Body, Controller, Get, Patch, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';

@UseGuards(JwtAuthGuard)
@Controller('user')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  getMe(@Request() req: any) {
    return this.usersService.getMe(req.user.id);
  }

  @Patch('me')
  updateMe(@Request() req: any, @Body() dto: UpdateUserDto) {
    return this.usersService.updateMe(req.user.id, dto);
  }
}
