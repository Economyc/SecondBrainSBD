import { useState, useCallback, useEffect, useMemo } from 'react';
import { v4 as uuid } from 'uuid';
import { onSnapshot, setDoc, updateDoc, deleteDoc, writeBatch } from 'firebase/firestore';
import { useEnvironment } from '@/contexts/EnvironmentContext';
import { getCol, getDocRef } from '@/lib/firestore';
import { db } from '@/lib/firebase';
import type { Transaction, RecurrenceFrequency } from '@/types';
import { addWeeks, addMonths, addYears, format, startOfDay } from 'date-fns';

function getNextDate(dateStr: string, frequency: RecurrenceFrequency): string {
  const d = new Date(dateStr + 'T00:00:00');
  switch (frequency) {
    case 'weekly': return format(addWeeks(d, 1), 'yyyy-MM-dd');
    case 'biweekly': return format(addWeeks(d, 2), 'yyyy-MM-dd');
    case 'monthly': return format(addMonths(d, 1), 'yyyy-MM-dd');
    case 'yearly': return format(addYears(d, 1), 'yyyy-MM-dd');
    default: return dateStr;
  }
}

/** Returns new transactions to create and template updates needed */
function computeRecurringUpdates(transactions: Transaction[]): {
  newTxs: Transaction[];
  templateUpdates: Map<string, Partial<Transaction>>;
} {
  const horizon = format(addMonths(startOfDay(new Date()), 3), 'yyyy-MM-dd');
  const newTxs: Transaction[] = [];
  const templateUpdates = new Map<string, Partial<Transaction>>();

  const templates = transactions.filter(
    t => t.recurrence && t.recurrence !== 'none' && !t.recurringParentId
  );

  for (const template of templates) {
    let lastDate = template.lastGeneratedDate || template.date;
    let nextDate = getNextDate(lastDate, template.recurrence!);

    while (nextDate <= horizon) {
      if (template.recurrenceEndDate && nextDate > template.recurrenceEndDate) break;

      const alreadyExists = transactions.some(
        t => t.recurringParentId === template.id && t.date === nextDate
      );

      if (!alreadyExists) {
        const today = format(startOfDay(new Date()), 'yyyy-MM-dd');
        newTxs.push({
          id: uuid(),
          type: template.type,
          amount: template.amount,
          description: template.description,
          category: template.category,
          date: nextDate,
          createdAt: new Date().toISOString(),
          paymentMethod: template.paymentMethod,
          status: template.type === 'expense' ? (nextDate <= today ? 'pending' : 'pending') : 'paid',
          recurringParentId: template.id,
        });
      }

      lastDate = nextDate;
      nextDate = getNextDate(lastDate, template.recurrence!);
    }

    if (lastDate !== (template.lastGeneratedDate || template.date)) {
      templateUpdates.set(template.id, { lastGeneratedDate: lastDate });
    }
  }

  return { newTxs, templateUpdates };
}

export function useFinances() {
  const { environment } = useEnvironment();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    setLoading(true);
    setInitialized(false);
    const unsub = onSnapshot(getCol(environment, 'transactions'), async (snapshot) => {
      const txs = snapshot.docs.map(d => d.data() as Transaction);
      setTransactions(txs);
      setLoading(false);

      // On first load, generate any missing recurring transactions
      if (!initialized) {
        setInitialized(true);
        const { newTxs, templateUpdates } = computeRecurringUpdates(txs);
        if (newTxs.length > 0 || templateUpdates.size > 0) {
          const batch = writeBatch(db);
          newTxs.forEach(tx => batch.set(getDocRef(environment, 'transactions', tx.id), tx));
          templateUpdates.forEach((updates, id) => batch.update(getDocRef(environment, 'transactions', id), updates));
          await batch.commit();
        }
      }
    });
    return unsub;
  }, [environment]);

  const addTransaction = useCallback(async (data: Omit<Transaction, 'id' | 'createdAt'>) => {
    const tx: Transaction = { ...data, id: uuid(), createdAt: new Date().toISOString() };
    const clean = Object.fromEntries(Object.entries(tx).filter(([, v]) => v !== undefined));
    await setDoc(getDocRef(environment, 'transactions', tx.id), clean);

    // Generate recurring children immediately if this is a template
    if (tx.recurrence && tx.recurrence !== 'none') {
      const allTxs = [...transactions, tx];
      const { newTxs, templateUpdates } = computeRecurringUpdates(allTxs);
      if (newTxs.length > 0 || templateUpdates.size > 0) {
        const batch = writeBatch(db);
        newTxs.forEach(t => batch.set(getDocRef(environment, 'transactions', t.id), t));
        templateUpdates.forEach((updates, id) => batch.update(getDocRef(environment, 'transactions', id), updates));
        await batch.commit();
      }
    }

    return tx;
  }, [environment, transactions]);

  const updateTransaction = useCallback(async (id: string, updates: Partial<Transaction>) => {
    await updateDoc(getDocRef(environment, 'transactions', id), updates);
  }, [environment]);

  const deleteTransaction = useCallback(async (id: string) => {
    await deleteDoc(getDocRef(environment, 'transactions', id));
  }, [environment]);

  const stopRecurrence = useCallback(async (id: string) => {
    await updateDoc(getDocRef(environment, 'transactions', id), {
      recurrence: 'none',
      recurrenceEndDate: null,
      lastGeneratedDate: null,
    });
  }, [environment]);

  const bulkDelete = useCallback(async (ids: string[]) => {
    const batch = writeBatch(db);
    ids.forEach(id => batch.delete(getDocRef(environment, 'transactions', id)));
    await batch.commit();
  }, [environment]);

  const bulkUpdate = useCallback(async (ids: string[], updates: Partial<Transaction>) => {
    const batch = writeBatch(db);
    ids.forEach(id => batch.update(getDocRef(environment, 'transactions', id), updates));
    await batch.commit();
  }, [environment]);

  const summary = useMemo(() => {
    const income = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const expenses = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    return { income, expenses, balance: income - expenses };
  }, [transactions]);

  const monthComparison = useMemo(() => {
    const now = new Date();
    const curMonth = format(now, 'yyyy-MM');
    const prevDate = addMonths(now, -1);
    const prevMonth = format(prevDate, 'yyyy-MM');

    const cur = { income: 0, expenses: 0 };
    const prev = { income: 0, expenses: 0 };

    transactions.forEach(t => {
      const m = t.date.substring(0, 7);
      if (m === curMonth) {
        if (t.type === 'income') cur.income += t.amount;
        else cur.expenses += t.amount;
      } else if (m === prevMonth) {
        if (t.type === 'income') prev.income += t.amount;
        else prev.expenses += t.amount;
      }
    });

    const pctChange = (cur: number, prev: number) => prev === 0 ? (cur > 0 ? 100 : 0) : Math.round(((cur - prev) / prev) * 100);

    return {
      incomeChange: pctChange(cur.income, prev.income),
      expensesChange: pctChange(cur.expenses, prev.expenses),
      curIncome: cur.income,
      curExpenses: cur.expenses,
      savingsRate: cur.income > 0 ? Math.round(((cur.income - cur.expenses) / cur.income) * 100) : 0,
    };
  }, [transactions]);

  const categoryBreakdown = useMemo(() => {
    const map = new Map<string, number>();
    transactions.filter(t => t.type === 'expense').forEach(t => {
      map.set(t.category, (map.get(t.category) || 0) + t.amount);
    });
    return Array.from(map.entries())
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount);
  }, [transactions]);

  const monthlyData = useMemo(() => {
    const map = new Map<string, { income: number; expenses: number }>();
    transactions.forEach(t => {
      const month = t.date.substring(0, 7);
      const entry = map.get(month) || { income: 0, expenses: 0 };
      if (t.type === 'income') entry.income += t.amount;
      else entry.expenses += t.amount;
      map.set(month, entry);
    });
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, data]) => ({ month, ...data }));
  }, [transactions]);

  const sortedTransactions = useMemo(() =>
    [...transactions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [transactions]
  );

  return {
    transactions: sortedTransactions,
    loading,
    addTransaction, updateTransaction, deleteTransaction, stopRecurrence,
    bulkDelete, bulkUpdate,
    summary, monthComparison, categoryBreakdown, monthlyData,
  };
}
