import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class KnowledgeService {
  constructor(private readonly prisma: PrismaService) {}

  getArticles(category?: string) {
    return this.prisma.knowledgeArticle.findMany({
      where: category ? { category } : undefined,
      orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }],
      select: {
        id: true,
        title: true,
        emoji: true,
        category: true,
        readTime: true,
        xpReward: true,
        sortOrder: true,
      },
    });
  }

  getArticle(id: string) {
    return this.prisma.knowledgeArticle.findUniqueOrThrow({ where: { id } });
  }
}
