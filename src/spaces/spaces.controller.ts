import { Body, Controller, Delete, Get, Param, Patch, Post, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SpacesService } from './spaces.service';
import { CreateSpaceDto } from './dto/create-space.dto';
import { AddMemberDto } from './dto/add-member.dto';
import { UpdateSpaceDto } from './dto/update-space.dto';

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

  @Patch(':id')
  updateSpace(@Request() req: any, @Param('id') spaceId: string, @Body() dto: UpdateSpaceDto) {
    return this.spacesService.updateSpace(req.user.id, spaceId, dto);
  }

  @Delete(':id')
  deleteSpace(@Request() req: any, @Param('id') spaceId: string) {
    return this.spacesService.deleteSpace(req.user.id, spaceId);
  }

  @Post('join/:token')
  joinByToken(@Request() req: any, @Param('token') token: string) {
    return this.spacesService.joinByToken(req.user.id, token);
  }

  @Post(':id/invite')
  createInvite(@Request() req: any, @Param('id') spaceId: string) {
    return this.spacesService.createInvite(req.user.id, spaceId);
  }

  @Delete(':id/leave')
  leaveSpace(@Request() req: any, @Param('id') spaceId: string) {
    return this.spacesService.leaveSpace(req.user.id, spaceId);
  }

  @Post(':id/members')
  addMember(@Request() req: any, @Param('id') spaceId: string, @Body() dto: AddMemberDto) {
    return this.spacesService.addMember(req.user.id, spaceId, dto);
  }
}
