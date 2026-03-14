import { useState, useCallback, useEffect, useMemo } from 'react';
import { v4 as uuid } from 'uuid';
import { onSnapshot, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { useEnvironment } from '@/contexts/EnvironmentContext';
import { getCol, getDocRef } from '@/lib/firestore';
import type { Investment, InvestmentEntry } from '@/types';

export function useInvestments() {
  const { environment } = useEnvironment();
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const unsub = onSnapshot(getCol(environment, 'investments'), (snapshot) => {
      setInvestments(snapshot.docs.map(d => d.data() as Investment));
      setLoading(false);
    });
    return unsub;
  }, [environment]);

  const addInvestment = useCallback(async (data: Omit<Investment, 'id' | 'createdAt' | 'updatedAt'>) => {
    const now = new Date().toISOString();
    const inv: Investment = { ...data, id: uuid(), createdAt: now, updatedAt: now };
    await setDoc(getDocRef(environment, 'investments', inv.id), inv);
    return inv;
  }, [environment]);

  const updateInvestment = useCallback(async (id: string, updates: Partial<Investment>) => {
    await updateDoc(getDocRef(environment, 'investments', id), { ...updates, updatedAt: new Date().toISOString() });
  }, [environment]);

  const deleteInvestment = useCallback(async (id: string) => {
    await deleteDoc(getDocRef(environment, 'investments', id));
  }, [environment]);

  const addEntry = useCallback(async (investmentId: string, entry: Omit<InvestmentEntry, 'id'>) => {
    const inv = investments.find(i => i.id === investmentId);
    if (!inv) return;
    const newEntry: InvestmentEntry = { ...entry, id: uuid() };
    const entries = [...inv.entries, newEntry];
    await updateDoc(getDocRef(environment, 'investments', investmentId), {
      entries,
      updatedAt: new Date().toISOString(),
    });
  }, [environment, investments]);

  const deleteEntry = useCallback(async (investmentId: string, entryId: string) => {
    const inv = investments.find(i => i.id === investmentId);
    if (!inv) return;
    const entries = inv.entries.filter(e => e.id !== entryId);
    await updateDoc(getDocRef(environment, 'investments', investmentId), {
      entries,
      updatedAt: new Date().toISOString(),
    });
  }, [environment, investments]);

  const portfolioSummary = useMemo(() => {
    let totalInvested = 0;
    let totalCurrentValue = 0;

    for (const inv of investments) {
      const buys = inv.entries.filter(e => e.type === 'buy').reduce((s, e) => s + e.totalAmount, 0);
      const sells = inv.entries.filter(e => e.type === 'sell').reduce((s, e) => s + e.totalAmount, 0);
      totalInvested += buys - sells;
      totalCurrentValue += inv.currentValue;
    }

    const totalROI = totalCurrentValue - totalInvested;
    const roiPercent = totalInvested > 0 ? Math.round((totalROI / totalInvested) * 100) : 0;

    return { totalInvested, totalCurrentValue, totalROI, roiPercent };
  }, [investments]);

  return { investments, loading, addInvestment, updateInvestment, deleteInvestment, addEntry, deleteEntry, portfolioSummary };
}
