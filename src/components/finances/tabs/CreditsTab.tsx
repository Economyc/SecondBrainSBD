import { useState } from 'react';
import { Plus, Pencil, Trash2, ChevronDown, CreditCard, DollarSign, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import type { Credit, CreditType, CreditPayment } from '@/types';
import { CREDIT_TYPES } from '@/types';
import { getAmortizationSchedule } from '@/hooks/useCredits';
import { SummaryCard } from '../shared/SummaryCard';
import { COP } from '../shared/constants';

interface CreditsTabProps {
  credits: Credit[];
  creditsSummary: { totalOwed: number; totalMonthlyPayments: number; activeCount: number };
  addCredit: (data: Omit<Credit, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Credit>;
  updateCredit: (id: string, updates: Partial<Credit>) => Promise<void>;
  deleteCredit: (id: string) => Promise<void>;
  addPayment: (creditId: string, payment: Omit<CreditPayment, 'id'>) => Promise<void>;
}

export function CreditsTab({ credits, creditsSummary, addCredit, updateCredit, deleteCredit, addPayment }: CreditsTabProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [editingCredit, setEditingCredit] = useState<Credit | null>(null);
  const [selectedCreditId, setSelectedCreditId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showAmortization, setShowAmortization] = useState<string | null>(null);

  // Credit form
  const [formName, setFormName] = useState('');
  const [formType, setFormType] = useState<CreditType>('personal');
  const [formOriginalAmount, setFormOriginalAmount] = useState('');
  const [formRemainingBalance, setFormRemainingBalance] = useState('');
  const [formInterestRate, setFormInterestRate] = useState('');
  const [formMonthlyPayment, setFormMonthlyPayment] = useState('');
  const [formStartDate, setFormStartDate] = useState('');
  const [formNotes, setFormNotes] = useState('');

  // Payment form
  const [payAmount, setPayAmount] = useState('');
  const [payPrincipal, setPayPrincipal] = useState('');
  const [payInterest, setPayInterest] = useState('');
  const [payDate, setPayDate] = useState(new Date().toISOString().substring(0, 10));
  const [payNotes, setPayNotes] = useState('');

  const resetForm = () => {
    setFormName(''); setFormType('personal'); setFormOriginalAmount('');
    setFormRemainingBalance(''); setFormInterestRate(''); setFormMonthlyPayment('');
    setFormStartDate(''); setFormNotes(''); setEditingCredit(null);
  };

  const resetPaymentForm = () => {
    setPayAmount(''); setPayPrincipal(''); setPayInterest('');
    setPayDate(new Date().toISOString().substring(0, 10)); setPayNotes('');
  };

  const openEdit = (credit: Credit) => {
    setEditingCredit(credit);
    setFormName(credit.name);
    setFormType(credit.type);
    setFormOriginalAmount(String(credit.originalAmount));
    setFormRemainingBalance(String(credit.remainingBalance));
    setFormInterestRate(String(credit.interestRate));
    setFormMonthlyPayment(String(credit.monthlyPayment));
    setFormStartDate(credit.startDate);
    setFormNotes(credit.notes || '');
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const data = {
      name: formName,
      type: formType,
      status: 'active' as const,
      originalAmount: parseFloat(formOriginalAmount),
      remainingBalance: parseFloat(formRemainingBalance || formOriginalAmount),
      interestRate: parseFloat(formInterestRate),
      monthlyPayment: parseFloat(formMonthlyPayment),
      startDate: formStartDate,
      payments: editingCredit?.payments || [],
      ...(formNotes ? { notes: formNotes } : {}),
    };
    if (editingCredit) {
      await updateCredit(editingCredit.id, data);
    } else {
      await addCredit(data);
    }
    setDialogOpen(false);
    resetForm();
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCreditId) return;
    const amount = parseFloat(payAmount);
    const interest = parseFloat(payInterest) || 0;
    const principal = parseFloat(payPrincipal) || (amount - interest);
    await addPayment(selectedCreditId, {
      amount,
      principal,
      interest,
      date: payDate,
      ...(payNotes ? { notes: payNotes } : {}),
    });
    setPaymentDialogOpen(false);
    resetPaymentForm();
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <SummaryCard icon={DollarSign} title="Deuda Total" value={COP(creditsSummary.totalOwed)} valueClassName={cn(creditsSummary.totalOwed > 0 && 'text-destructive')} />
        <SummaryCard icon={Clock} title="Pago Mensual Total" value={COP(creditsSummary.totalMonthlyPayments)} />
        <SummaryCard icon={CreditCard} title="Creditos Activos" value={String(creditsSummary.activeCount)} />
      </div>

      {/* Header + Add */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{credits.length} creditos</p>
        <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) resetForm(); }}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1.5"><Plus className="h-4 w-4" /> Anadir Credito</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{editingCredit ? 'Editar Credito' : 'Anadir Credito'}</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="Nombre del credito" required />
              <Select value={formType} onValueChange={(v) => setFormType(v as CreditType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CREDIT_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
                <Input className="pl-7" inputMode="numeric" value={formOriginalAmount ? Number(formOriginalAmount).toLocaleString('es-CO') : ''} onChange={(e) => setFormOriginalAmount(e.target.value.replace(/[^0-9]/g, '') || '')} placeholder="Monto original" required />
              </div>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
                <Input className="pl-7" inputMode="numeric" value={formRemainingBalance ? Number(formRemainingBalance).toLocaleString('es-CO') : ''} onChange={(e) => setFormRemainingBalance(e.target.value.replace(/[^0-9]/g, '') || '')} placeholder="Saldo restante (opc)" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="relative">
                  <Input inputMode="decimal" value={formInterestRate} onChange={(e) => setFormInterestRate(e.target.value)} placeholder="Tasa anual %" required />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">%</span>
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
                  <Input className="pl-7" inputMode="numeric" value={formMonthlyPayment ? Number(formMonthlyPayment).toLocaleString('es-CO') : ''} onChange={(e) => setFormMonthlyPayment(e.target.value.replace(/[^0-9]/g, '') || '')} placeholder="Cuota mensual" required />
                </div>
              </div>
              <Input type="date" value={formStartDate} onChange={(e) => setFormStartDate(e.target.value)} required />
              <Input value={formNotes} onChange={(e) => setFormNotes(e.target.value)} placeholder="Notas (opcional)" />
              <Button type="submit" className="w-full">{editingCredit ? 'Actualizar' : 'Crear'}</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Credits List */}
      {credits.length > 0 ? (
        <div className="space-y-2">
          {credits.map(credit => {
            const typeLabel = CREDIT_TYPES.find(t => t.value === credit.type)?.label || credit.type;
            const paidPercent = credit.originalAmount > 0 ? Math.round(((credit.originalAmount - credit.remainingBalance) / credit.originalAmount) * 100) : 0;
            const amortization = showAmortization === credit.id ? getAmortizationSchedule(credit) : [];

            return (
              <Collapsible key={credit.id} open={expandedId === credit.id} onOpenChange={(o) => setExpandedId(o ? credit.id : null)}>
                <div className="border rounded-lg">
                  <CollapsibleTrigger asChild>
                    <div className="group flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-muted/30 transition-colors">
                      <ChevronDown className={cn('h-4 w-4 transition-transform', expandedId === credit.id && 'rotate-180')} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium truncate">{credit.name}</p>
                          <Badge variant="secondary" className="text-[10px]">{typeLabel}</Badge>
                          <Badge variant={credit.status === 'active' ? 'default' : 'secondary'} className="text-[10px]">
                            {credit.status === 'active' ? 'Activo' : 'Pagado'}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <Progress value={paidPercent} className="h-1.5 flex-1 [&>div]:bg-chart-2" />
                          <span className="text-[10px] text-muted-foreground">{paidPercent}% pagado</span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-medium">{COP(credit.remainingBalance)}</p>
                        <p className="text-[10px] text-muted-foreground">{COP(credit.monthlyPayment)}/mes · {credit.interestRate}%</p>
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); openEdit(credit); }}><Pencil className="h-3 w-3" /></Button>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); deleteCredit(credit.id); }}><Trash2 className="h-3 w-3" /></Button>
                      </div>
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="border-t px-4 py-3 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">{credit.payments.length} pagos registrados</span>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setShowAmortization(showAmortization === credit.id ? null : credit.id)}>
                            {showAmortization === credit.id ? 'Ocultar tabla' : 'Tabla amortizacion'}
                          </Button>
                          <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => { setSelectedCreditId(credit.id); setPaymentDialogOpen(true); }}>
                            <Plus className="h-3 w-3" /> Registrar Pago
                          </Button>
                        </div>
                      </div>

                      {/* Payment History */}
                      {credit.payments.length > 0 && (
                        <div className="space-y-1">
                          {[...credit.payments].sort((a, b) => b.date.localeCompare(a.date)).map(payment => (
                            <div key={payment.id} className="flex items-center gap-3 px-2 py-1.5 rounded hover:bg-muted/30 text-xs">
                              <span className="text-muted-foreground w-20">{payment.date}</span>
                              <span className="flex-1">Capital: {COP(payment.principal)} · Interes: {COP(payment.interest)}</span>
                              <span className="font-medium">{COP(payment.amount)}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Amortization Table */}
                      {showAmortization === credit.id && amortization.length > 0 && (
                        <div className="max-h-64 overflow-auto">
                          <table className="w-full text-xs">
                            <thead className="sticky top-0 bg-background">
                              <tr className="border-b text-muted-foreground">
                                <th className="text-left py-1.5 px-2">Mes</th>
                                <th className="text-right py-1.5 px-2">Cuota</th>
                                <th className="text-right py-1.5 px-2">Capital</th>
                                <th className="text-right py-1.5 px-2">Interes</th>
                                <th className="text-right py-1.5 px-2">Saldo</th>
                              </tr>
                            </thead>
                            <tbody>
                              {amortization.map(row => (
                                <tr key={row.month} className="border-b last:border-0">
                                  <td className="py-1.5 px-2">{row.month}</td>
                                  <td className="text-right py-1.5 px-2">{COP(row.payment)}</td>
                                  <td className="text-right py-1.5 px-2">{COP(row.principal)}</td>
                                  <td className="text-right py-1.5 px-2">{COP(row.interest)}</td>
                                  <td className="text-right py-1.5 px-2">{COP(row.balance)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-16 text-muted-foreground text-sm">
          No hay creditos. Anade el primero.
        </div>
      )}

      {/* Payment Dialog */}
      <Dialog open={paymentDialogOpen} onOpenChange={(o) => { setPaymentDialogOpen(o); if (!o) resetPaymentForm(); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Registrar Pago</DialogTitle></DialogHeader>
          <form onSubmit={handlePaymentSubmit} className="space-y-4">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
              <Input className="pl-7" inputMode="numeric" value={payAmount ? Number(payAmount).toLocaleString('es-CO') : ''} onChange={(e) => setPayAmount(e.target.value.replace(/[^0-9]/g, '') || '')} placeholder="Monto total del pago" required />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
                <Input className="pl-7" inputMode="numeric" value={payPrincipal ? Number(payPrincipal).toLocaleString('es-CO') : ''} onChange={(e) => setPayPrincipal(e.target.value.replace(/[^0-9]/g, '') || '')} placeholder="Capital" />
              </div>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
                <Input className="pl-7" inputMode="numeric" value={payInterest ? Number(payInterest).toLocaleString('es-CO') : ''} onChange={(e) => setPayInterest(e.target.value.replace(/[^0-9]/g, '') || '')} placeholder="Interes" />
              </div>
            </div>
            <Input type="date" value={payDate} onChange={(e) => setPayDate(e.target.value)} required />
            <Input value={payNotes} onChange={(e) => setPayNotes(e.target.value)} placeholder="Notas (opcional)" />
            <Button type="submit" className="w-full">Registrar</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
