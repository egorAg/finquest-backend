import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async getSummary(userId: string, spaceId: string, month: string) {
    const [member, space] = await Promise.all([
      this.prisma.spaceMember.findUnique({
        where: { spaceId_userId: { spaceId, userId } },
      }),
      this.prisma.space.findUnique({ where: { id: spaceId } }),
    ]);
    if (!member) throw new ForbiddenException('Not a member of this space');
    if (!space) throw new NotFoundException('Space not found');

    const [year, mon] = month.split('-').map(Number);
    const from = new Date(year, mon - 1, 1);
    const to = new Date(year, mon, 1);

    // Previous month range
    const prevFrom = new Date(year, mon - 2, 1);
    const prevTo = from;

    const [transactions, prevTransactions] = await Promise.all([
      this.prisma.transaction.findMany({
        where: { spaceId, date: { gte: from, lt: to } },
      }),
      this.prisma.transaction.findMany({
        where: { spaceId, date: { gte: prevFrom, lt: prevTo } },
      }),
    ]);

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

    // Most expensive day of week (expenses only)
    const DOW_NAMES = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];
    const dowMap = new Map<number, number>();
    for (const t of transactions.filter((t) => t.type === 'EXPENSE')) {
      const dow = t.date.getDay();
      dowMap.set(dow, (dowMap.get(dow) ?? 0) + t.amount);
    }
    let mostExpensiveDay: { day: string; dayIndex: number; amount: number } | null = null;
    if (dowMap.size > 0) {
      const [topDow, topAmount] = [...dowMap.entries()].sort((a, b) => b[1] - a[1])[0];
      mostExpensiveDay = { day: DOW_NAMES[topDow], dayIndex: topDow, amount: topAmount };
    }

    // Most frequent category (by count, expenses only)
    const catCountMap = new Map<string, { emoji: string; count: number }>();
    for (const t of transactions.filter((t) => t.type === 'EXPENSE')) {
      const prev = catCountMap.get(t.category) ?? { emoji: t.categoryEmoji, count: 0 };
      catCountMap.set(t.category, { emoji: prev.emoji, count: prev.count + 1 });
    }
    let frequentCategory: { category: string; emoji: string; count: number } | null = null;
    if (catCountMap.size > 0) {
      const [topCat, { emoji: topEmoji, count: topCount }] = [...catCountMap.entries()]
        .sort((a, b) => b[1].count - a[1].count)[0];
      frequentCategory = { category: topCat, emoji: topEmoji, count: topCount };
    }

    // Previous month totals
    const prevIncome = prevTransactions
      .filter((t) => t.type === 'INCOME')
      .reduce((s, t) => s + t.amount, 0);
    const prevExpense = prevTransactions
      .filter((t) => t.type === 'EXPENSE')
      .reduce((s, t) => s + t.amount, 0);

    // Month metadata for forecast
    const daysInMonth = new Date(year, mon, 0).getDate();
    const today = new Date();
    const isCurrentMonth = today.getFullYear() === year && today.getMonth() + 1 === mon;
    const daysElapsed = isCurrentMonth ? today.getDate() : daysInMonth;

    // Savings streak: consecutive days within daily budget limit
    const prevDaysInMonth = new Date(year, mon - 1, 0).getDate();
    const dailyLimit = space.monthlyBudget
      ? space.monthlyBudget / daysInMonth
      : prevExpense > 0
        ? prevExpense / prevDaysInMonth
        : null;

    let savingsStreak: number | null = null;
    if (dailyLimit !== null) {
      savingsStreak = 0;
      // Build a map of day number -> expense for quick lookup
      const dayExpenseMap = new Map<number, number>();
      for (const entry of byDay) {
        const dayNum = new Date(entry.date).getDate();
        dayExpenseMap.set(dayNum, entry.expense);
      }
      // Count backwards from last elapsed day
      for (let d = daysElapsed; d >= 1; d--) {
        const dayExp = dayExpenseMap.get(d) ?? 0;
        if (dayExp <= dailyLimit) {
          savingsStreak++;
        } else {
          break;
        }
      }
    }

    return {
      income, expense, balance, byCategory, byDay,
      prevMonth: { income: prevIncome, expense: prevExpense, balance: prevIncome - prevExpense },
      daysInMonth,
      daysElapsed,
      mostExpensiveDay,
      frequentCategory,
      savingsStreak,
      monthlyBudget: space.monthlyBudget ?? null,
    };
  }
}
