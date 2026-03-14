import { useState, useCallback, useEffect, useMemo } from 'react';
import { v4 as uuid } from 'uuid';
import { onSnapshot, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { useEnvironment } from '@/contexts/EnvironmentContext';
import { getCol, getDocRef } from '@/lib/firestore';
import type { Credit, CreditPayment } from '@/types';

export interface AmortizationRow {
  month: number;
  payment: number;
  principal: number;
  interest: number;
  balance: number;
}

export function getAmortizationSchedule(credit: Credit): AmortizationRow[] {
  const rows: AmortizationRow[] = [];
  const monthlyRate = credit.interestRate / 100 / 12;
  let balance = credit.remainingBalance;
  let month = 1;

  while (balance > 0.01 && month <= 600) { // safety limit 50 years
    const interest = balance * monthlyRate;
    const payment = Math.min(credit.monthlyPayment, balance + interest);
    const principal = payment - interest;
    balance = Math.max(0, balance - principal);
    rows.push({ month, payment: Math.round(payment), principal: Math.round(principal), interest: Math.round(interest), balance: Math.round(balance) });
    month++;
  }

  return rows;
}

export function useCredits() {
  const { environment } = useEnvironment();
  const [credits, setCredits] = useState<Credit[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const unsub = onSnapshot(getCol(environment, 'credits'), (snapshot) => {
      setCredits(snapshot.docs.map(d => d.data() as Credit));
      setLoading(false);
    });
    return unsub;
  }, [environment]);

  const addCredit = useCallback(async (data: Omit<Credit, 'id' | 'createdAt' | 'updatedAt'>) => {
    const now = new Date().toISOString();
    const credit: Credit = { ...data, id: uuid(), createdAt: now, updatedAt: now };
    await setDoc(getDocRef(environment, 'credits', credit.id), credit);
    return credit;
  }, [environment]);

  const updateCredit = useCallback(async (id: string, updates: Partial<Credit>) => {
    await updateDoc(getDocRef(environment, 'credits', id), { ...updates, updatedAt: new Date().toISOString() });
  }, [environment]);

  const deleteCredit = useCallback(async (id: string) => {
    await deleteDoc(getDocRef(environment, 'credits', id));
  }, [environment]);

  const addPayment = useCallback(async (creditId: string, payment: Omit<CreditPayment, 'id'>) => {
    const credit = credits.find(c => c.id === creditId);
    if (!credit) return;
    const newPayment: CreditPayment = { ...payment, id: uuid() };
    const payments = [...credit.payments, newPayment];
    const remainingBalance = Math.max(0, credit.remainingBalance - payment.principal);
    const status = remainingBalance <= 0 ? 'paid_off' as const : credit.status;
    await updateDoc(getDocRef(environment, 'credits', creditId), {
      payments,
      remainingBalance,
      status,
      updatedAt: new Date().toISOString(),
    });
  }, [environment, credits]);

  const creditsSummary = useMemo(() => {
    const active = credits.filter(c => c.status === 'active');
    return {
      totalOwed: active.reduce((s, c) => s + c.remainingBalance, 0),
      totalMonthlyPayments: active.reduce((s, c) => s + c.monthlyPayment, 0),
      activeCount: active.length,
    };
  }, [credits]);

  return { credits, loading, addCredit, updateCredit, deleteCredit, addPayment, creditsSummary };
}
