import { useMemo } from 'react';
import { addMonths, format } from 'date-fns';
import type { Transaction, Budget, Credit } from '@/types';

export interface ProjectionPoint {
  month: string;
  balance: number;
  income: number;
  expenses: number;
}

export interface CategoryForecast {
  category: string;
  average: number;
  trend: 'up' | 'down' | 'stable';
  trendPercent: number;
}

interface ProjectionsInput {
  transactions: Transaction[];
  budgets: Budget[];
  credits: Credit[];
  currentBalance: number;
}

function getMonthlyRecurringTotal(transactions: Transaction[], type: 'income' | 'expense'): number {
  const recurring = transactions.filter(t => t.type === type && t.recurrence && t.recurrence !== 'none' && !t.recurringParentId);
  let total = 0;
  for (const t of recurring) {
    switch (t.recurrence) {
      case 'weekly': total += t.amount * 4.33; break;
      case 'biweekly': total += t.amount * 2.17; break;
      case 'monthly': total += t.amount; break;
      case 'yearly': total += t.amount / 12; break;
    }
  }
  return total;
}

function getAvgLast3Months(transactions: Transaction[], category: string): number {
  const now = new Date();
  const months: string[] = [];
  for (let i = 1; i <= 3; i++) {
    months.push(format(addMonths(now, -i), 'yyyy-MM'));
  }
  const relevant = transactions.filter(t => t.type === 'expense' && t.category === category && months.includes(t.date.substring(0, 7)));
  return relevant.length > 0 ? relevant.reduce((s, t) => s + t.amount, 0) / 3 : 0;
}

export function useProjections({ transactions, budgets, credits, currentBalance }: ProjectionsInput) {
  const projectCashFlow = useMemo(() => {
    return (horizonMonths: number): ProjectionPoint[] => {
      const recurringIncome = getMonthlyRecurringTotal(transactions, 'income');
      const recurringExpenses = getMonthlyRecurringTotal(transactions, 'expense');
      const creditPayments = credits.filter(c => c.status === 'active').reduce((s, c) => s + c.monthlyPayment, 0);

      // Non-recurring categories: use 3-month average
      const expenseCategories = new Set(transactions.filter(t => t.type === 'expense').map(t => t.category));
      const recurringCategories = new Set(
        transactions.filter(t => t.type === 'expense' && t.recurrence && t.recurrence !== 'none' && !t.recurringParentId).map(t => t.category)
      );

      let nonRecurringExpenses = 0;
      for (const cat of expenseCategories) {
        if (!recurringCategories.has(cat)) {
          const budgetLimit = budgets.find(b => b.category === cat);
          const avg = getAvgLast3Months(transactions, cat);
          nonRecurringExpenses += budgetLimit ? Math.min(avg, budgetLimit.amount) : avg;
        }
      }

      const totalMonthlyExpenses = recurringExpenses + nonRecurringExpenses + creditPayments;
      const points: ProjectionPoint[] = [];
      let balance = currentBalance;

      for (let i = 1; i <= horizonMonths; i++) {
        const monthStr = format(addMonths(new Date(), i), 'yyyy-MM');
        balance = balance + recurringIncome - totalMonthlyExpenses;
        points.push({ month: monthStr, balance: Math.round(balance), income: Math.round(recurringIncome), expenses: Math.round(totalMonthlyExpenses) });
      }

      return points;
    };
  }, [transactions, budgets, credits, currentBalance]);

  const spendingForecast = useMemo((): CategoryForecast[] => {
    const now = new Date();
    const categories = new Set(transactions.filter(t => t.type === 'expense').map(t => t.category));
    const forecasts: CategoryForecast[] = [];

    for (const cat of categories) {
      const months: number[] = [];
      for (let i = 1; i <= 3; i++) {
        const m = format(addMonths(now, -i), 'yyyy-MM');
        const total = transactions.filter(t => t.type === 'expense' && t.category === cat && t.date.substring(0, 7) === m).reduce((s, t) => s + t.amount, 0);
        months.push(total);
      }

      const avg = months.reduce((s, v) => s + v, 0) / 3;
      if (avg === 0) continue;

      // Trend: compare most recent vs oldest
      const recent = months[0]; // most recent
      const oldest = months[2]; // oldest
      let trend: 'up' | 'down' | 'stable' = 'stable';
      let trendPercent = 0;

      if (oldest > 0) {
        trendPercent = Math.round(((recent - oldest) / oldest) * 100);
        if (trendPercent > 5) trend = 'up';
        else if (trendPercent < -5) trend = 'down';
      }

      forecasts.push({ category: cat, average: Math.round(avg), trend, trendPercent });
    }

    return forecasts.sort((a, b) => b.average - a.average).slice(0, 5);
  }, [transactions]);

  const whatIfScenario = useMemo(() => {
    return (adjustments: { incomeChangePercent?: number; additionalMonthlyExpense?: number }, horizonMonths: number): ProjectionPoint[] => {
      const recurringIncome = getMonthlyRecurringTotal(transactions, 'income');
      const adjustedIncome = recurringIncome * (1 + (adjustments.incomeChangePercent || 0) / 100);
      const recurringExpenses = getMonthlyRecurringTotal(transactions, 'expense');
      const creditPayments = credits.filter(c => c.status === 'active').reduce((s, c) => s + c.monthlyPayment, 0);

      const expenseCategories = new Set(transactions.filter(t => t.type === 'expense').map(t => t.category));
      const recurringCategories = new Set(
        transactions.filter(t => t.type === 'expense' && t.recurrence && t.recurrence !== 'none' && !t.recurringParentId).map(t => t.category)
      );
      let nonRecurringExpenses = 0;
      for (const cat of expenseCategories) {
        if (!recurringCategories.has(cat)) {
          nonRecurringExpenses += getAvgLast3Months(transactions, cat);
        }
      }

      const totalExpenses = recurringExpenses + nonRecurringExpenses + creditPayments + (adjustments.additionalMonthlyExpense || 0);
      const points: ProjectionPoint[] = [];
      let balance = currentBalance;

      for (let i = 1; i <= horizonMonths; i++) {
        const monthStr = format(addMonths(new Date(), i), 'yyyy-MM');
        balance = balance + adjustedIncome - totalExpenses;
        points.push({ month: monthStr, balance: Math.round(balance), income: Math.round(adjustedIncome), expenses: Math.round(totalExpenses) });
      }

      return points;
    };
  }, [transactions, credits, currentBalance]);

  return { projectCashFlow, spendingForecast, whatIfScenario };
}
