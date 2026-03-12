import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { KnowledgeService } from './knowledge.service';

@UseGuards(JwtAuthGuard)
@Controller('knowledge')
export class KnowledgeController {
  constructor(private readonly knowledgeService: KnowledgeService) {}

  @Get()
  getArticles(@Query('category') category?: string) {
    return this.knowledgeService.getArticles(category);
  }

  @Get(':id')
  getArticle(@Param('id') id: string) {
    return this.knowledgeService.getArticle(id);
  }
}
