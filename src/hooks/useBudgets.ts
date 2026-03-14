import { useState, useCallback, useEffect, useMemo } from 'react';
import { v4 as uuid } from 'uuid';
import { onSnapshot, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { useEnvironment } from '@/contexts/EnvironmentContext';
import { getCol, getDocRef } from '@/lib/firestore';
import type { Budget, Transaction } from '@/types';

export function useBudgets(transactions: Transaction[]) {
  const { environment } = useEnvironment();
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const unsub = onSnapshot(getCol(environment, 'budgets'), (snapshot) => {
      setBudgets(snapshot.docs.map(d => d.data() as Budget));
      setLoading(false);
    });
    return unsub;
  }, [environment]);

  const addBudget = useCallback(async (data: Omit<Budget, 'id' | 'createdAt' | 'updatedAt'>) => {
    const now = new Date().toISOString();
    const budget: Budget = { ...data, id: uuid(), createdAt: now, updatedAt: now };
    await setDoc(getDocRef(environment, 'budgets', budget.id), budget);
    return budget;
  }, [environment]);

  const updateBudget = useCallback(async (id: string, updates: Partial<Budget>) => {
    await updateDoc(getDocRef(environment, 'budgets', id), { ...updates, updatedAt: new Date().toISOString() });
  }, [environment]);

  const deleteBudget = useCallback(async (id: string) => {
    await deleteDoc(getDocRef(environment, 'budgets', id));
  }, [environment]);

  const budgetStatuses = useMemo(() => {
    const map = new Map<string, { spent: number; limit: number; percentage: number; alertLevel: 'ok' | 'warning' | 'danger' }>();
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const currentYear = now.getFullYear();

    for (const budget of budgets) {
      // Filter transactions by budget period
      let relevantTxs: Transaction[];
      if (budget.period === 'monthly') {
        const month = budget.month || currentMonth;
        relevantTxs = transactions.filter(t => t.type === 'expense' && t.category === budget.category && t.date.substring(0, 7) === month);
      } else {
        const year = budget.year || currentYear;
        relevantTxs = transactions.filter(t => t.type === 'expense' && t.category === budget.category && t.date.substring(0, 4) === String(year));
      }

      const spent = relevantTxs.reduce((s, t) => s + t.amount, 0);
      const percentage = budget.amount > 0 ? Math.round((spent / budget.amount) * 100) : 0;
      const alertLevel = percentage >= 90 ? 'danger' : percentage >= 70 ? 'warning' : 'ok';

      map.set(budget.category, { spent, limit: budget.amount, percentage, alertLevel });
    }

    return map;
  }, [budgets, transactions]);

  return { budgets, loading, addBudget, updateBudget, deleteBudget, budgetStatuses };
}
