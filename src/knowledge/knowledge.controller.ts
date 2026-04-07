import { Controller, Get, Param, Post, Query, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { KnowledgeService } from './knowledge.service';

@UseGuards(JwtAuthGuard)
@Controller('knowledge')
export class KnowledgeController {
  constructor(private readonly knowledgeService: KnowledgeService) {}

  @Get()
  getArticles(@Request() req: any, @Query('category') category?: string) {
    return this.knowledgeService.getArticles(req.user.id, category);
  }

  @Get(':id')
  getArticle(@Param('id') id: string) {
    return this.knowledgeService.getArticle(id);
  }

  @Post(':id/read')
  markRead(@Request() req: any, @Param('id') id: string) {
    return this.knowledgeService.markRead(req.user.id, id);
  }
}
