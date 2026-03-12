import { useState, useMemo, useCallback } from 'react';
import { Plus, Pencil, Trash2, TrendingUp, TrendingDown, DollarSign, Clock, CheckCircle2, UtensilsCrossed, Car, Home, Zap, Clapperboard, ShoppingBag, HeartPulse, GraduationCap, Plane, CreditCard, Briefcase, Megaphone, Users, Monitor, HelpCircle, Banknote, PiggyBank, Receipt, HandCoins, Building, CalendarIcon, X, Wallet, SlidersHorizontal, Repeat, Square, Download, Percent, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  'Food & Dining': UtensilsCrossed, 'Transportation': Car, 'Housing': Home, 'Utilities': Zap,
  'Entertainment': Clapperboard, 'Shopping': ShoppingBag, 'Healthcare': HeartPulse, 'Education': GraduationCap,
  'Travel': Plane, 'Subscriptions': CreditCard, 'Office': Briefcase, 'Marketing': Megaphone,
  'Software': Monitor, 'Salary': Banknote, 'Freelance': HandCoins, 'Investment': PiggyBank,
  'Sales': Receipt, 'Consulting': Users, 'Rental': Building, 'Refund': Receipt, 'Other': HelpCircle,
};

import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { useFinances } from '@/hooks/useFinances';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, PAYMENT_METHODS, RECURRENCE_OPTIONS, type Transaction, type PaymentStatus, type RecurrenceFrequency } from '@/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const COP = (v: number) => v.toLocaleString('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 });

const PIE_COLORS = [
  'hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))',
  'hsl(var(--chart-4))', 'hsl(var(--chart-5))', 'hsl(var(--primary))',
  'hsl(var(--accent))', 'hsl(var(--muted-foreground))',
];

function ChangeIndicator({ value }: { value: number }) {
  if (value === 0) return null;
  const up = value > 0;
  return (
    <span className={cn('text-[10px] flex items-center gap-0.5', up ? 'text-chart-2' : 'text-chart-4')}>
      {up ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
      {Math.abs(value)}%
    </span>
  );
}

export function FinanceDashboard() {
  const { transactions, addTransaction, updateTransaction, deleteTransaction, stopRecurrence, bulkDelete, bulkUpdate, summary, monthComparison, categoryBreakdown, monthlyData } = useFinances();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all');
  const [filterDateFrom, setFilterDateFrom] = useState<Date | undefined>();
  const [filterDateTo, setFilterDateTo] = useState<Date | undefined>();
  const [dateMode, setDateMode] = useState<'single' | 'range'>('single');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'paid'>('all');

  const [formType, setFormType] = useState<'income' | 'expense'>('expense');
  const [formAmount, setFormAmount] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formCategory, setFormCategory] = useState('');
  const [formDate, setFormDate] = useState(new Date().toISOString().substring(0, 10));
  const [formPaymentMethod, setFormPaymentMethod] = useState('');
  const [formStatus, setFormStatus] = useState<PaymentStatus>('pending');
  const [formRecurrence, setFormRecurrence] = useState<RecurrenceFrequency>('none');
  const [formRecurrenceEndDate, setFormRecurrenceEndDate] = useState('');

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const categories = formType === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  const usedCategories = useMemo(() => {
    const cats = new Set(transactions.map(t => t.category).filter(Boolean));
    return Array.from(cats).sort();
  }, [transactions]);

  const filteredTransactions = useMemo(() => {
    let result = transactions;
    if (filterCategory !== 'all') result = result.filter(t => t.category === filterCategory);
    if (filterType !== 'all') result = result.filter(t => t.type === filterType);
    if (filterStatus !== 'all') result = result.filter(t => t.type === 'expense' && t.status === filterStatus);
    if (filterDateFrom) result = result.filter(t => t.date >= filterDateFrom.toISOString().substring(0, 10));
    if (filterDateTo) result = result.filter(t => t.date <= filterDateTo.toISOString().substring(0, 10));
    return result;
  }, [transactions, filterCategory, filterType, filterStatus, filterDateFrom, filterDateTo]);

  const hasActiveFilters = filterCategory !== 'all' || filterType !== 'all' || filterStatus !== 'all' || filterDateFrom || filterDateTo;

  const clearFilters = () => {
    setFilterCategory('all');
    setFilterType('all');
    setFilterStatus('all');
    setFilterDateFrom(undefined);
    setFilterDateTo(undefined);
  };

  const resetForm = () => {
    setFormType('expense');
    setFormAmount('');
    setFormDesc('');
    setFormCategory('');
    setFormDate(new Date().toISOString().substring(0, 10));
    setFormPaymentMethod('');
    setFormStatus('pending');
    setFormRecurrence('none');
    setFormRecurrenceEndDate('');
    setEditingTx(null);
  };

  const openEdit = (tx: Transaction) => {
    setEditingTx(tx);
    setFormType(tx.type);
    setFormAmount(String(tx.amount));
    setFormDesc(tx.description);
    setFormCategory(tx.category);
    setFormDate(tx.date);
    setFormPaymentMethod(tx.paymentMethod || '');
    setFormStatus(tx.status || 'paid');
    setFormRecurrence(tx.recurrence || 'none');
    setFormRecurrenceEndDate(tx.recurrenceEndDate || '');
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const data: Omit<Transaction, 'id' | 'createdAt'> = {
      type: formType,
      amount: parseFloat(formAmount),
      description: formDesc,
      category: formCategory,
      date: formDate,
      status: (formType === 'expense' ? 'pending' : 'paid') as PaymentStatus,
      recurrence: formRecurrence,
      ...(formPaymentMethod ? { paymentMethod: formPaymentMethod } : {}),
      ...(formRecurrenceEndDate ? { recurrenceEndDate: formRecurrenceEndDate } : {}),
    };
    if (editingTx) {
      await updateTransaction(editingTx.id, data);
    } else {
      await addTransaction(data);
    }
    setDialogOpen(false);
    resetForm();
  };

  const allPending = useMemo(() => transactions.filter(t => t.type === 'expense' && t.status === 'pending'), [transactions]);
  const pendingTotal = allPending.reduce((s, t) => s + t.amount, 0);

  // Bulk actions
  const toggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    if (selectedIds.size === filteredTransactions.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredTransactions.map(t => t.id)));
    }
  }, [filteredTransactions, selectedIds.size]);

  const handleBulkDelete = () => { bulkDelete(Array.from(selectedIds)); setSelectedIds(new Set()); };
  const handleBulkMarkPaid = () => { bulkUpdate(Array.from(selectedIds), { status: 'paid' }); setSelectedIds(new Set()); };
  const handleBulkChangeCategory = (cat: string) => { bulkUpdate(Array.from(selectedIds), { category: cat }); setSelectedIds(new Set()); };

  // CSV Export
  const exportCSV = useCallback(() => {
    const headers = ['Fecha', 'Tipo', 'Descripción', 'Categoría', 'Cantidad', 'Estado', 'Método de Pago'];
    const rows = filteredTransactions.map(t => [
      t.date, t.type, `"${t.description}"`, t.category, t.amount, t.status || '', t.paymentMethod || ''
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transactions-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [filteredTransactions]);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Finanzas</h1>
          <p className="text-sm text-muted-foreground">{transactions.length} transacciones</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={exportCSV}>
            <Download className="h-4 w-4" />
            Exportar
          </Button>
          <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) resetForm(); }}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1.5">
                <Plus className="h-4 w-4" />
                Añadir
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingTx ? 'Editar Transacción' : 'Añadir Transacción'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="flex gap-2">
                  <Button type="button" variant={formType === 'income' ? 'default' : 'outline'} size="sm" onClick={() => setFormType('income')} className="flex-1">Ingreso</Button>
                  <Button type="button" variant={formType === 'expense' ? 'default' : 'outline'} size="sm" onClick={() => setFormType('expense')} className="flex-1">Gasto</Button>
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
                  <Input
                    className="pl-7"
                    inputMode="numeric"
                    value={formAmount ? Number(formAmount).toLocaleString('es-CO') : ''}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/[^0-9]/g, '');
                      setFormAmount(raw || '');
                    }}
                    placeholder="0"
                    required
                  />
                </div>
                <Input value={formDesc} onChange={(e) => setFormDesc(e.target.value)} placeholder="Descripción" required />
                <Select value={formCategory} onValueChange={setFormCategory} required>
                  <SelectTrigger><SelectValue placeholder="Categoría" /></SelectTrigger>
                  <SelectContent>
                    {categories.map(c => {
                      const Icon = CATEGORY_ICONS[c] || HelpCircle;
                      return (<SelectItem key={c} value={c}><span className="flex items-center gap-2"><Icon className="h-3.5 w-3.5 text-muted-foreground" />{c}</span></SelectItem>);
                    })}
                  </SelectContent>
                </Select>
                <Select value={formPaymentMethod} onValueChange={setFormPaymentMethod}>
                  <SelectTrigger><SelectValue placeholder="Método de pago" /></SelectTrigger>
                  <SelectContent>{PAYMENT_METHODS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                </Select>
                {!editingTx?.recurringParentId && (
                  <>
                    <Select value={formRecurrence} onValueChange={(v) => setFormRecurrence(v as RecurrenceFrequency)}>
                      <SelectTrigger><SelectValue placeholder="Repetir" /></SelectTrigger>
                      <SelectContent>
                        {RECURRENCE_OPTIONS.map(o => (
                          <SelectItem key={o.value} value={o.value}>
                            <span className="flex items-center gap-2">{o.value !== 'none' && <Repeat className="h-3.5 w-3.5 text-muted-foreground" />}{o.label}</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {formRecurrence !== 'none' && (
                      <div className="space-y-1">
                        <label className="text-xs text-muted-foreground">Fecha de fin (opcional)</label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" className={cn('w-full justify-start text-left font-normal', !formRecurrenceEndDate && 'text-muted-foreground')}>
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {formRecurrenceEndDate ? format(new Date(formRecurrenceEndDate + 'T00:00:00'), 'PPP') : 'Elegir fecha'}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={formRecurrenceEndDate ? new Date(formRecurrenceEndDate + 'T00:00:00') : undefined}
                              onSelect={(d) => setFormRecurrenceEndDate(d ? format(d, 'yyyy-MM-dd') : '')}
                              initialFocus
                              className={cn('p-3 pointer-events-auto')}
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                    )}
                  </>
                )}
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn('w-full justify-start text-left font-normal')}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formDate ? format(new Date(formDate + 'T00:00:00'), 'PPP') : 'Elegir fecha'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={formDate ? new Date(formDate + 'T00:00:00') : undefined}
                      onSelect={(d) => { if (d) setFormDate(format(d, 'yyyy-MM-dd')); }}
                      initialFocus
                      className={cn('p-3 pointer-events-auto')}
                    />
                  </PopoverContent>
                </Popover>
                <Button type="submit" className="w-full">{editingTx ? 'Actualizar' : 'Añadir'}</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 stagger-children">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4" /> Ingresos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{COP(summary.income)}</p>
            <ChangeIndicator value={monthComparison.incomeChange} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingDown className="h-4 w-4" /> Gastos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{COP(summary.expenses)}</p>
            <ChangeIndicator value={monthComparison.expensesChange} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <DollarSign className="h-4 w-4" /> Balance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className={cn('text-2xl font-semibold', summary.balance < 0 && 'text-destructive')}>{COP(summary.balance)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Clock className="h-4 w-4" /> Pendiente
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{COP(pendingTotal)}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{allPending.length} gastos</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Percent className="h-4 w-4" /> Tasa de Ahorro
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className={cn('text-2xl font-semibold', monthComparison.savingsRate < 0 && 'text-destructive')}>
              {monthComparison.savingsRate}%
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">este mes</p>
          </CardContent>
        </Card>
      </div>

      {/* Pending Expenses */}
      {allPending.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <Clock className="h-3.5 w-3.5" /> Pagos pendientes
            </h2>
            <span className="text-xs text-muted-foreground">{allPending.length} restantes</span>
          </div>
          <div className="border rounded-lg divide-y">
            {allPending.map(tx => (
              <div key={tx.id} className="group flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{tx.description}</p>
                  <p className="text-xs text-muted-foreground">{tx.category} · {tx.date}{tx.paymentMethod && ` · ${tx.paymentMethod}`}</p>
                </div>
                <span className="text-sm font-medium text-muted-foreground">{COP(tx.amount)}</span>
                <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => updateTransaction(tx.id, { status: 'paid' })}>
                  <CheckCircle2 className="h-3 w-3" /> Marcar pagado
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Charts */}
      {(monthlyData.length > 0 || categoryBreakdown.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {monthlyData.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-sm font-medium">Resumen Mensual</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={monthlyData}>
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="income" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="expenses" fill="hsl(var(--chart-4))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
          {categoryBreakdown.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-sm font-medium">Gastos por Categoría</CardTitle></CardHeader>
              <CardContent>
                <div className="flex items-center gap-4">
                  <ResponsiveContainer width={160} height={160}>
                    <PieChart>
                      <Pie
                        data={categoryBreakdown}
                        dataKey="amount"
                        nameKey="category"
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={70}
                        paddingAngle={2}
                      >
                        {categoryBreakdown.map((_, i) => (
                          <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v: number) => COP(v)} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex-1 space-y-1.5 overflow-hidden">
                    {categoryBreakdown.slice(0, 6).map((item, i) => (
                      <div key={item.category} className="flex items-center gap-2 text-xs">
                        <div className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                        <span className="truncate flex-1">{item.category}</span>
                        <span className="text-muted-foreground shrink-0">{COP(item.amount)}</span>
                      </div>
                    ))}
                    {categoryBreakdown.length > 6 && (
                      <p className="text-[10px] text-muted-foreground">+{categoryBreakdown.length - 6} más</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Transaction List */}
      <div className="space-y-3">
        {/* Filters + Bulk bar */}
        <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen}>
          <div className="flex items-center gap-2">
            <CollapsibleTrigger asChild>
              <Button variant="outline" size="sm" className={cn('h-8 text-xs gap-1.5', hasActiveFilters && 'border-primary text-primary')}>
                <SlidersHorizontal className="h-3.5 w-3.5" />
                Filtros
                {hasActiveFilters && (
                  <Badge variant="secondary" className="h-4 px-1 text-[10px] ml-0.5">
                    {[filterType !== 'all', filterCategory !== 'all', filterStatus !== 'all', !!filterDateFrom, !!filterDateTo].filter(Boolean).length}
                  </Badge>
                )}
              </Button>
            </CollapsibleTrigger>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" className="h-8 text-xs gap-1 text-muted-foreground" onClick={clearFilters}>
                <X className="h-3 w-3" /> Limpiar
              </Button>
            )}
            {hasActiveFilters && (
              <span className="text-xs text-muted-foreground ml-auto">
                {filteredTransactions.length} resultado{filteredTransactions.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>
          <CollapsibleContent className="mt-2">
            <div className="flex items-center gap-2 flex-wrap">
              <Select value={filterType} onValueChange={(v) => setFilterType(v as 'all' | 'income' | 'expense')}>
                <SelectTrigger className="w-[130px] h-8 text-xs"><SelectValue placeholder="Todos los tipos" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los tipos</SelectItem>
                  <SelectItem value="income"><span className="flex items-center gap-2"><TrendingUp className="h-3.5 w-3.5" />Ingresos</span></SelectItem>
                  <SelectItem value="expense"><span className="flex items-center gap-2"><TrendingDown className="h-3.5 w-3.5" />Gastos</span></SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger className="w-[170px] h-8 text-xs"><SelectValue placeholder="Todas las categorías" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las categorías</SelectItem>
                  {usedCategories.map(c => {
                    const Icon = CATEGORY_ICONS[c] || HelpCircle;
                    return <SelectItem key={c} value={c}><span className="flex items-center gap-2"><Icon className="h-3.5 w-3.5 text-muted-foreground" />{c}</span></SelectItem>;
                  })}
                </SelectContent>
              </Select>
              <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as 'all' | 'pending' | 'paid')}>
                <SelectTrigger className="w-[130px] h-8 text-xs"><SelectValue placeholder="Todos los estados" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los estados</SelectItem>
                  <SelectItem value="pending"><span className="flex items-center gap-2"><Clock className="h-3.5 w-3.5" />Pendiente</span></SelectItem>
                  <SelectItem value="paid"><span className="flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5" />Pagado</span></SelectItem>
                </SelectContent>
              </Select>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className={cn('h-8 text-xs gap-1.5', !(filterDateFrom || filterDateTo) && 'text-muted-foreground')}>
                    <CalendarIcon className="h-3 w-3" />
                    {filterDateFrom && filterDateTo
                      ? `${format(filterDateFrom, 'MMM d')} – ${format(filterDateTo, 'MMM d')}`
                      : filterDateFrom ? format(filterDateFrom, 'MMM d, yyyy') : 'Fecha'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end" side="bottom">
                  <div className="p-1 flex border-b">
                    <button
                      type="button"
                      className={cn('flex-1 px-3 py-1.5 text-xs rounded-md font-medium transition-colors', dateMode === 'single' ? 'bg-muted' : 'text-muted-foreground hover:text-foreground')}
                      onClick={() => { setDateMode('single'); setFilterDateFrom(undefined); setFilterDateTo(undefined); }}
                    >
                      Día exacto
                    </button>
                    <button
                      type="button"
                      className={cn('flex-1 px-3 py-1.5 text-xs rounded-md font-medium transition-colors', dateMode === 'range' ? 'bg-muted' : 'text-muted-foreground hover:text-foreground')}
                      onClick={() => { setDateMode('range'); setFilterDateFrom(undefined); setFilterDateTo(undefined); }}
                    >
                      Rango de fechas
                    </button>
                  </div>
                  {dateMode === 'single' ? (
                    <Calendar mode="single" selected={filterDateFrom} onSelect={(d) => { setFilterDateFrom(d); setFilterDateTo(d); }} initialFocus className={cn('p-3 pointer-events-auto')} />
                  ) : (
                    <div className="flex gap-4 p-3">
                      <div className="space-y-1.5">
                        <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Desde</p>
                        <Calendar mode="single" selected={filterDateFrom} onSelect={setFilterDateFrom} initialFocus className={cn('p-0 pointer-events-auto')} />
                      </div>
                      <div className="space-y-1.5">
                        <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Hasta</p>
                        <Calendar mode="single" selected={filterDateTo} onSelect={setFilterDateTo} className={cn('p-0 pointer-events-auto')} />
                      </div>
                    </div>
                  )}
                  {(filterDateFrom || filterDateTo) && (
                    <div className="border-t p-2">
                      <Button variant="ghost" size="sm" className="w-full h-7 text-xs" onClick={() => { setFilterDateFrom(undefined); setFilterDateTo(undefined); }}>Limpiar fecha</Button>
                    </div>
                  )}
                </PopoverContent>
              </Popover>
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Bulk Actions Bar */}
        {selectedIds.size > 0 && (
          <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50 border">
            <span className="text-xs font-medium">{selectedIds.size} seleccionados</span>
            <div className="flex-1" />
            <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={handleBulkMarkPaid}>
              <CheckCircle2 className="h-3 w-3" /> Marcar pagado
            </Button>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-7 text-xs">Cambiar categoría</Button>
              </PopoverTrigger>
              <PopoverContent className="w-48 p-1" align="end">
                {[...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES].filter((c, i, a) => a.indexOf(c) === i).map(c => (
                  <button key={c} className="w-full text-left px-2 py-1.5 text-xs rounded-sm hover:bg-muted transition-colors flex items-center gap-2" onClick={() => handleBulkChangeCategory(c)}>
                    {(() => { const Icon = CATEGORY_ICONS[c] || HelpCircle; return <Icon className="h-3 w-3 text-muted-foreground" />; })()}
                    {c}
                  </button>
                ))}
              </PopoverContent>
            </Popover>
            <Button variant="destructive" size="sm" className="h-7 text-xs gap-1" onClick={handleBulkDelete}>
              <Trash2 className="h-3 w-3" /> Eliminar
            </Button>
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setSelectedIds(new Set())}>Cancelar</Button>
          </div>
        )}

        {/* Transaction rows */}
        <div className="space-y-1">
          {filteredTransactions.length > 0 && (
            <div className="flex items-center gap-3 px-3 py-1.5">
              <Checkbox
                checked={selectedIds.size === filteredTransactions.length && filteredTransactions.length > 0}
                onCheckedChange={toggleSelectAll}
                className="h-4 w-4"
              />
              <span className="text-[11px] text-muted-foreground">Seleccionar todo</span>
            </div>
          )}
          {filteredTransactions.map(tx => (
            <div key={tx.id} className={cn('group flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-accent/50 transition-colors animate-in-slide-up', selectedIds.has(tx.id) && 'bg-accent/30')}>
              <Checkbox
                checked={selectedIds.has(tx.id)}
                onCheckedChange={() => toggleSelect(tx.id)}
                className="h-4 w-4 shrink-0"
              />
              <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${tx.type === 'income' ? 'bg-secondary' : 'bg-muted'}`}>
                {(() => { const Icon = CATEGORY_ICONS[tx.category] || (tx.type === 'income' ? TrendingUp : TrendingDown); return <Icon className="h-4 w-4" />; })()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="text-sm font-medium truncate">{tx.description}</p>
                  {(tx.recurrence && tx.recurrence !== 'none') && <Repeat className="h-3 w-3 text-muted-foreground shrink-0" />}
                  {tx.recurringParentId && <Repeat className="h-3 w-3 text-muted-foreground/50 shrink-0" />}
                </div>
                <p className="text-xs text-muted-foreground">{tx.category} · {tx.date}</p>
              </div>

              {/* CRM-style status for expenses */}
              {tx.type === 'expense' && (
                <div className="flex items-center gap-1.5 shrink-0">
                  {tx.status === 'pending' ? (
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" size="sm" className="h-7 text-[11px] gap-1.5 border-dashed text-muted-foreground hover:border-solid hover:text-foreground">
                          <Clock className="h-3 w-3" /> Pendiente
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-40 p-1" align="end">
                        <p className="px-2 py-1.5 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Marcar pagado vía</p>
                        {PAYMENT_METHODS.map(m => (
                          <button key={m} className="w-full text-left px-2 py-1.5 text-xs rounded-sm hover:bg-muted transition-colors flex items-center gap-2" onClick={() => updateTransaction(tx.id, { status: 'paid', paymentMethod: m })}>
                            <Wallet className="h-3 w-3 text-muted-foreground" />{m}
                          </button>
                        ))}
                      </PopoverContent>
                    </Popover>
                  ) : (
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="secondary" size="sm" className="h-7 text-[11px] gap-1.5">
                          <CheckCircle2 className="h-3 w-3" /> Pagado
                          {tx.paymentMethod && <span className="text-muted-foreground">· {tx.paymentMethod}</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-44 p-1" align="end">
                        <p className="px-2 py-1.5 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Cambiar método</p>
                        {PAYMENT_METHODS.map(m => (
                          <button key={m} className={cn('w-full text-left px-2 py-1.5 text-xs rounded-sm hover:bg-muted transition-colors flex items-center gap-2', tx.paymentMethod === m && 'bg-muted')} onClick={() => updateTransaction(tx.id, { paymentMethod: m })}>
                            <Wallet className="h-3 w-3 text-muted-foreground" />{m}
                          </button>
                        ))}
                        <div className="border-t my-1" />
                        <button className="w-full text-left px-2 py-1.5 text-xs rounded-sm hover:bg-muted transition-colors flex items-center gap-2 text-muted-foreground" onClick={() => updateTransaction(tx.id, { status: 'pending', paymentMethod: undefined })}>
                          <Clock className="h-3 w-3" /> Volver a pendiente
                        </button>
                      </PopoverContent>
                    </Popover>
                  )}
                </div>
              )}

              <span className={cn('text-sm font-medium shrink-0', tx.type === 'income' ? '' : 'text-muted-foreground')}>
                {tx.type === 'income' ? '+' : '-'}{COP(tx.amount)}
              </span>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => openEdit(tx)}><Pencil className="h-3 w-3" /></Button>
                {tx.recurrence && tx.recurrence !== 'none' && (
                  <Button variant="ghost" size="icon" className="h-6 w-6" title="Detener recurrencia" onClick={() => stopRecurrence(tx.id)}><Square className="h-3 w-3" /></Button>
                )}
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => deleteTransaction(tx.id)}><Trash2 className="h-3 w-3" /></Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {transactions.length === 0 && (
        <div className="text-center py-16 text-muted-foreground text-sm">
          Aún no hay transacciones. Añade la primera.
        </div>
      )}
    </div>
  );
}
