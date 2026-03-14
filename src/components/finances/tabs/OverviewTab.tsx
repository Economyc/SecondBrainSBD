import { useMemo } from 'react';
import { TrendingUp, TrendingDown, DollarSign, Clock, Percent, CheckCircle2, AlertTriangle, Landmark, TrendingDown as DebtIcon, Wallet } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import type { Transaction, Budget, Investment, Credit } from '@/types';
import { SummaryCard } from '../shared/SummaryCard';
import { COP, PIE_COLORS, CATEGORY_ICONS } from '../shared/constants';

interface OverviewTabProps {
  transactions: Transaction[];
  summary: { income: number; expenses: number; balance: number };
  monthComparison: { incomeChange: number; expensesChange: number; savingsRate: number };
  categoryBreakdown: { category: string; amount: number }[];
  monthlyData: { month: string; income: number; expenses: number }[];
  updateTransaction: (id: string, updates: Partial<Transaction>) => Promise<void>;
  budgets: Budget[];
  budgetStatuses: Map<string, { spent: number; limit: number; percentage: number; alertLevel: 'ok' | 'warning' | 'danger' }>;
  investments: Investment[];
  portfolioSummary: { totalInvested: number; totalCurrentValue: number; totalROI: number; roiPercent: number };
  credits: Credit[];
  creditsSummary: { totalOwed: number; totalMonthlyPayments: number; activeCount: number };
}

export function OverviewTab({
  transactions, summary, monthComparison, categoryBreakdown, monthlyData, updateTransaction,
  budgets, budgetStatuses, investments, portfolioSummary, credits, creditsSummary,
}: OverviewTabProps) {
  const allPending = useMemo(() => transactions.filter(t => t.type === 'expense' && t.status === 'pending'), [transactions]);
  const pendingTotal = allPending.reduce((s, t) => s + t.amount, 0);

  const netWorth = summary.balance + portfolioSummary.totalCurrentValue - creditsSummary.totalOwed;

  const budgetAlerts = useMemo(() => {
    const alerts: { category: string; percentage: number; alertLevel: string }[] = [];
    budgetStatuses.forEach((status, category) => {
      if (status.alertLevel === 'warning' || status.alertLevel === 'danger') {
        alerts.push({ category, percentage: status.percentage, alertLevel: status.alertLevel });
      }
    });
    return alerts.sort((a, b) => b.percentage - a.percentage);
  }, [budgetStatuses]);

  const upcomingPayments = useMemo(() => {
    return credits
      .filter(c => c.status === 'active')
      .map(c => ({ name: c.name, amount: c.monthlyPayment, type: c.type }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);
  }, [credits]);

  return (
    <div className="space-y-6">
      {/* Main Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 stagger-children">
        <SummaryCard icon={TrendingUp} title="Ingresos" value={COP(summary.income)} change={monthComparison.incomeChange} />
        <SummaryCard icon={TrendingDown} title="Gastos" value={COP(summary.expenses)} change={monthComparison.expensesChange} />
        <SummaryCard icon={DollarSign} title="Balance" value={COP(summary.balance)} valueClassName={cn(summary.balance < 0 && 'text-destructive')} />
        <SummaryCard icon={Clock} title="Pendiente" value={COP(pendingTotal)} subtitle={`${allPending.length} gastos`} />
        <SummaryCard icon={Percent} title="Tasa de Ahorro" value={`${monthComparison.savingsRate}%`} subtitle="este mes" valueClassName={cn(monthComparison.savingsRate < 0 && 'text-destructive')} />
      </div>

      {/* Extended Summary: Investments, Debt, Net Worth */}
      {(investments.length > 0 || credits.length > 0) && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <SummaryCard icon={Landmark} title="Valor Inversiones" value={COP(portfolioSummary.totalCurrentValue)} subtitle={investments.length > 0 ? `ROI: ${portfolioSummary.roiPercent}%` : undefined} />
          <SummaryCard icon={DebtIcon} title="Deuda Total" value={COP(creditsSummary.totalOwed)} subtitle={`${creditsSummary.activeCount} creditos activos`} valueClassName={cn(creditsSummary.totalOwed > 0 && 'text-destructive')} />
          <SummaryCard icon={Wallet} title="Patrimonio Neto" value={COP(netWorth)} valueClassName={cn(netWorth < 0 && 'text-destructive')} />
        </div>
      )}

      {/* Budget Alerts */}
      {budgetAlerts.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-500" /> Alertas de Presupuesto
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {budgetAlerts.map(alert => {
              const status = budgetStatuses.get(alert.category)!;
              return (
                <div key={alert.category} className="flex items-center gap-3">
                  <span className="text-sm flex-1 truncate">{alert.category}</span>
                  <Progress
                    value={Math.min(alert.percentage, 100)}
                    className={cn('w-24 h-2', alert.alertLevel === 'danger' ? '[&>div]:bg-destructive' : '[&>div]:bg-yellow-500')}
                  />
                  <span className="text-xs text-muted-foreground w-20 text-right">
                    {COP(status.spent)} / {COP(status.limit)}
                  </span>
                  <Badge variant={alert.alertLevel === 'danger' ? 'destructive' : 'secondary'} className="text-[10px]">
                    {alert.percentage}%
                  </Badge>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Upcoming Credit Payments */}
      {upcomingPayments.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4" /> Proximos Pagos de Credito
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="divide-y">
              {upcomingPayments.map((p, i) => (
                <div key={i} className="flex items-center justify-between py-2">
                  <span className="text-sm">{p.name}</span>
                  <span className="text-sm font-medium">{COP(p.amount)}/mes</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

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
              <CardHeader><CardTitle className="text-sm font-medium">Gastos por Categoria</CardTitle></CardHeader>
              <CardContent>
                <div className="flex items-center gap-4">
                  <ResponsiveContainer width={160} height={160}>
                    <PieChart>
                      <Pie data={categoryBreakdown} dataKey="amount" nameKey="category" cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={2}>
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
                      <p className="text-[10px] text-muted-foreground">+{categoryBreakdown.length - 6} mas</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
