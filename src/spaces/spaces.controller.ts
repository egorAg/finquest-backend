import { Body, Controller, Get, Param, Post, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SpacesService } from './spaces.service';
import { CreateSpaceDto } from './dto/create-space.dto';
import { AddMemberDto } from './dto/add-member.dto';

@UseGuards(JwtAuthGuard)
@Controller('spaces')
export class SpacesController {
  constructor(private readonly spacesService: SpacesService) {}

  @Get()
  getSpaces(@Request() req: any) {
    return this.spacesService.getSpaces(req.user.id);
  }

  @Post()
  createSpace(@Request() req: any, @Body() dto: CreateSpaceDto) {
    return this.spacesService.createSpace(req.user.id, dto);
  }

  @Post('join/:token')
  joinByToken(@Request() req: any, @Param('token') token: string) {
    return this.spacesService.joinByToken(req.user.id, token);
  }

  @Post(':id/invite')
  createInvite(@Request() req: any, @Param('id') spaceId: string) {
    return this.spacesService.createInvite(req.user.id, spaceId);
  }

  @Post(':id/members')
  addMember(@Request() req: any, @Param('id') spaceId: string, @Body() dto: AddMemberDto) {
    return this.spacesService.addMember(req.user.id, spaceId, dto);
  }
}
