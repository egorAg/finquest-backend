import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async getSummary(userId: string, spaceId: string, month: string) {
    const member = await this.prisma.spaceMember.findUnique({
      where: { spaceId_userId: { spaceId, userId } },
    });
    if (!member) throw new ForbiddenException('Not a member of this space');

    const [year, mon] = month.split('-').map(Number);
    const from = new Date(year, mon - 1, 1);
    const to = new Date(year, mon, 1);

    const transactions = await this.prisma.transaction.findMany({
      where: { spaceId, date: { gte: from, lt: to } },
    });

    const income = transactions
      .filter((t) => t.type === 'INCOME')
      .reduce((s, t) => s + t.amount, 0);
    const expense = transactions
      .filter((t) => t.type === 'EXPENSE')
      .reduce((s, t) => s + t.amount, 0);
    const balance = income - expense;

    // По категориям (расходы)
    const catMap = new Map<string, { emoji: string; amount: number }>();
    for (const t of transactions.filter((t) => t.type === 'EXPENSE')) {
      const prev = catMap.get(t.category) ?? { emoji: t.categoryEmoji, amount: 0 };
      catMap.set(t.category, { emoji: prev.emoji, amount: prev.amount + t.amount });
    }
    const byCategory = [...catMap.entries()].map(([category, { emoji, amount }]) => ({
      category,
      emoji,
      amount,
      percent: expense > 0 ? Math.round((amount / expense) * 100) : 0,
    }));

    // По дням
    const dayMap = new Map<string, { income: number; expense: number }>();
    for (const t of transactions) {
      const key = t.date.toISOString().slice(0, 10);
      const prev = dayMap.get(key) ?? { income: 0, expense: 0 };
      if (t.type === 'INCOME') prev.income += t.amount;
      else prev.expense += t.amount;
      dayMap.set(key, prev);
    }
    const byDay = [...dayMap.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, vals]) => ({ date, ...vals }));

    return { income, expense, balance, byCategory, byDay };
  }
}
