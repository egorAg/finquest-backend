import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { XpService } from '../xp/xp.service';

@Injectable()
export class KnowledgeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly xp: XpService,
  ) {}

  async getArticles(userId: string, category?: string) {
    const articles = await this.prisma.knowledgeArticle.findMany({
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

    const reads = await this.prisma.userArticleRead.findMany({
      where: { userId },
      select: { articleId: true },
    });
    const readSet = new Set(reads.map((r) => r.articleId));

    return articles.map((a) => ({ ...a, isRead: readSet.has(a.id) }));
  }

  getArticle(id: string) {
    return this.prisma.knowledgeArticle.findUniqueOrThrow({ where: { id } });
  }

  async markRead(userId: string, articleId: string) {
    const article = await this.prisma.knowledgeArticle.findUnique({ where: { id: articleId } });
    if (!article) throw new NotFoundException('Article not found');

    const existing = await this.prisma.userArticleRead.findUnique({
      where: { userId_articleId: { userId, articleId } },
    });
    if (existing) return { ok: true, xpEarned: 0 };

    await this.prisma.userArticleRead.create({ data: { userId, articleId } });
    await this.xp.addXp(userId, article.xpReward);

    return { ok: true, xpEarned: article.xpReward };
  }
}
