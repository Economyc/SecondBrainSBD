import { useState, useMemo } from 'react';
import { Plus, Pencil, Trash2, HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import type { Budget, BudgetPeriod, Transaction } from '@/types';
import { EXPENSE_CATEGORIES } from '@/types';
import { COP, CATEGORY_ICONS } from '../shared/constants';

interface BudgetsTabProps {
  budgets: Budget[];
  budgetStatuses: Map<string, { spent: number; limit: number; percentage: number; alertLevel: 'ok' | 'warning' | 'danger' }>;
  transactions: Transaction[];
  addBudget: (data: Omit<Budget, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Budget>;
  updateBudget: (id: string, updates: Partial<Budget>) => Promise<void>;
  deleteBudget: (id: string) => Promise<void>;
}

export function BudgetsTab({ budgets, budgetStatuses, transactions, addBudget, updateBudget, deleteBudget }: BudgetsTabProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  const [formCategory, setFormCategory] = useState('');
  const [formAmount, setFormAmount] = useState('');
  const [formPeriod, setFormPeriod] = useState<BudgetPeriod>('monthly');
  const [formNotes, setFormNotes] = useState('');

  // Month/year selector
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());

  const resetForm = () => {
    setFormCategory('');
    setFormAmount('');
    setFormPeriod('monthly');
    setFormNotes('');
    setEditingBudget(null);
  };

  const openEdit = (budget: Budget) => {
    setEditingBudget(budget);
    setFormCategory(budget.category);
    setFormAmount(String(budget.amount));
    setFormPeriod(budget.period);
    setFormNotes(budget.notes || '');
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const data = {
      category: formCategory,
      amount: parseFloat(formAmount),
      period: formPeriod,
      ...(formPeriod === 'monthly' ? { month: selectedMonth } : { year: selectedYear }),
      ...(formNotes ? { notes: formNotes } : {}),
    };

    if (editingBudget) {
      await updateBudget(editingBudget.id, data);
    } else {
      await addBudget(data);
    }
    setDialogOpen(false);
    resetForm();
  };

  // Filter budgets by selected period
  const filteredBudgets = useMemo(() => {
    return budgets.filter(b => {
      if (b.period === 'monthly') return b.month === selectedMonth;
      return b.year === selectedYear;
    });
  }, [budgets, selectedMonth, selectedYear]);

  // Categories with expenses but no budget
  const unbudgetedCategories = useMemo(() => {
    const budgetedCats = new Set(filteredBudgets.map(b => b.category));
    const expenseCats = new Map<string, number>();
    const monthPrefix = selectedMonth;
    transactions
      .filter(t => t.type === 'expense' && t.date.substring(0, 7) === monthPrefix && !budgetedCats.has(t.category))
      .forEach(t => {
        expenseCats.set(t.category, (expenseCats.get(t.category) || 0) + t.amount);
      });
    return Array.from(expenseCats.entries()).sort((a, b) => b[1] - a[1]);
  }, [filteredBudgets, transactions, selectedMonth]);

  // Month options
  const monthOptions = useMemo(() => {
    const opts: string[] = [];
    for (let i = -6; i <= 6; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      opts.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    }
    return opts;
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-[140px] h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {monthOptions.map(m => (
                <SelectItem key={m} value={m}>{m}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) resetForm(); }}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1.5">
              <Plus className="h-4 w-4" /> Anadir Presupuesto
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingBudget ? 'Editar Presupuesto' : 'Anadir Presupuesto'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <Select value={formCategory} onValueChange={setFormCategory} required>
                <SelectTrigger><SelectValue placeholder="Categoria" /></SelectTrigger>
                <SelectContent>
                  {EXPENSE_CATEGORIES.map(c => {
                    const Icon = CATEGORY_ICONS[c] || HelpCircle;
                    return (<SelectItem key={c} value={c}><span className="flex items-center gap-2"><Icon className="h-3.5 w-3.5 text-muted-foreground" />{c}</span></SelectItem>);
                  })}
                </SelectContent>
              </Select>
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
                  placeholder="Limite"
                  required
                />
              </div>
              <Select value={formPeriod} onValueChange={(v) => setFormPeriod(v as BudgetPeriod)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Mensual</SelectItem>
                  <SelectItem value="yearly">Anual</SelectItem>
                </SelectContent>
              </Select>
              <Input value={formNotes} onChange={(e) => setFormNotes(e.target.value)} placeholder="Notas (opcional)" />
              <Button type="submit" className="w-full">{editingBudget ? 'Actualizar' : 'Crear'}</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Budget Cards Grid */}
      {filteredBudgets.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredBudgets.map(budget => {
            const status = budgetStatuses.get(budget.category);
            const Icon = CATEGORY_ICONS[budget.category] || HelpCircle;
            const spent = status?.spent || 0;
            const percentage = status?.percentage || 0;
            const remaining = budget.amount - spent;

            return (
              <Card key={budget.id} className="group relative">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    {budget.category}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Progress
                    value={Math.min(percentage, 100)}
                    className={cn(
                      'h-2',
                      percentage >= 90 ? '[&>div]:bg-destructive' :
                      percentage >= 70 ? '[&>div]:bg-yellow-500' :
                      '[&>div]:bg-chart-2'
                    )}
                  />
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">{COP(spent)} / {COP(budget.amount)}</span>
                    <span className={cn(
                      'font-medium',
                      remaining < 0 ? 'text-destructive' : 'text-chart-2'
                    )}>
                      {remaining >= 0 ? `${COP(remaining)} restante` : `${COP(Math.abs(remaining))} excedido`}
                    </span>
                  </div>
                  {budget.notes && <p className="text-xs text-muted-foreground">{budget.notes}</p>}
                </CardContent>
                <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => openEdit(budget)}><Pencil className="h-3 w-3" /></Button>
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => deleteBudget(budget.id)}><Trash2 className="h-3 w-3" /></Button>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-16 text-muted-foreground text-sm">
          No hay presupuestos para este periodo.
        </div>
      )}

      {/* Unbudgeted Categories */}
      {unbudgetedCategories.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Gastos sin presupuesto</h2>
          <div className="border rounded-lg divide-y">
            {unbudgetedCategories.map(([cat, amount]) => {
              const Icon = CATEGORY_ICONS[cat] || HelpCircle;
              return (
                <div key={cat} className="flex items-center gap-3 px-4 py-3">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm flex-1">{cat}</span>
                  <span className="text-sm font-medium text-muted-foreground">{COP(amount)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
