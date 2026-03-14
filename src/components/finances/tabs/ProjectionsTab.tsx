import { useState, useMemo } from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import type { ProjectionPoint, CategoryForecast } from '@/hooks/useProjections';
import { COP } from '../shared/constants';

interface ProjectionsTabProps {
  projectCashFlow: (months: number) => ProjectionPoint[];
  spendingForecast: CategoryForecast[];
  whatIfScenario: (adjustments: { incomeChangePercent?: number; additionalMonthlyExpense?: number }, horizonMonths: number) => ProjectionPoint[];
  currentBalance: number;
}

export function ProjectionsTab({ projectCashFlow, spendingForecast, whatIfScenario, currentBalance }: ProjectionsTabProps) {
  const [horizon, setHorizon] = useState(6);
  const [incomeChange, setIncomeChange] = useState('');
  const [additionalExpense, setAdditionalExpense] = useState('');

  const baseProjection = useMemo(() => projectCashFlow(horizon), [projectCashFlow, horizon]);

  const hasWhatIf = incomeChange !== '' || additionalExpense !== '';
  const whatIfProjection = useMemo(() => {
    if (!hasWhatIf) return null;
    return whatIfScenario(
      {
        incomeChangePercent: incomeChange ? parseFloat(incomeChange) : undefined,
        additionalMonthlyExpense: additionalExpense ? parseFloat(additionalExpense) : undefined,
      },
      horizon,
    );
  }, [whatIfScenario, horizon, incomeChange, additionalExpense, hasWhatIf]);

  // Merge base and whatIf for chart
  const chartData = useMemo(() => {
    return baseProjection.map((point, i) => ({
      month: point.month,
      balance: point.balance,
      ...(whatIfProjection ? { whatIf: whatIfProjection[i]?.balance } : {}),
    }));
  }, [baseProjection, whatIfProjection]);

  const TrendIcon = ({ trend }: { trend: 'up' | 'down' | 'stable' }) => {
    if (trend === 'up') return <TrendingUp className="h-3.5 w-3.5 text-destructive" />;
    if (trend === 'down') return <TrendingDown className="h-3.5 w-3.5 text-chart-2" />;
    return <Minus className="h-3.5 w-3.5 text-muted-foreground" />;
  };

  return (
    <div className="space-y-6">
      {/* Horizon Selector */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Horizonte:</span>
        {[3, 6, 12].map(m => (
          <Button key={m} variant={horizon === m ? 'default' : 'outline'} size="sm" className="h-8 text-xs" onClick={() => setHorizon(m)}>
            {m} meses
          </Button>
        ))}
      </div>

      {/* Main Projection Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Balance Proyectado</CardTitle>
        </CardHeader>
        <CardContent>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="balanceGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--chart-2))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--chart-2))" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="whatIfGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--chart-4))" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="hsl(var(--chart-4))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: number) => COP(v)} />
                <Area type="monotone" dataKey="balance" stroke="hsl(var(--chart-2))" fill="url(#balanceGrad)" strokeWidth={2} name="Proyeccion base" />
                {whatIfProjection && (
                  <Area type="monotone" dataKey="whatIf" stroke="hsl(var(--chart-4))" fill="url(#whatIfGrad)" strokeWidth={2} strokeDasharray="5 5" name="Que pasaria si..." />
                )}
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">No hay datos suficientes para proyectar.</p>
          )}
        </CardContent>
      </Card>

      {/* Spending Forecast */}
      {spendingForecast.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Tendencia de Gasto (Top 5)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {spendingForecast.map(f => (
                <div key={f.category} className="flex items-center gap-3">
                  <TrendIcon trend={f.trend} />
                  <span className="text-sm flex-1 truncate">{f.category}</span>
                  <span className="text-sm font-medium">{COP(f.average)}/mes</span>
                  <span className={cn(
                    'text-xs w-16 text-right',
                    f.trend === 'up' ? 'text-destructive' : f.trend === 'down' ? 'text-chart-2' : 'text-muted-foreground'
                  )}>
                    {f.trendPercent > 0 ? '+' : ''}{f.trendPercent}%
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* What-If Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Que pasaria si...</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">Si mis ingresos cambian en %</label>
              <div className="relative">
                <Input
                  inputMode="decimal"
                  value={incomeChange}
                  onChange={(e) => setIncomeChange(e.target.value.replace(/[^0-9.-]/g, ''))}
                  placeholder="Ej: -10 o 15"
                  className="pr-7"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">%</span>
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">Si agrego un gasto mensual de</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
                <Input
                  className="pl-7"
                  inputMode="numeric"
                  value={additionalExpense ? Number(additionalExpense).toLocaleString('es-CO') : ''}
                  onChange={(e) => setAdditionalExpense(e.target.value.replace(/[^0-9]/g, '') || '')}
                  placeholder="0"
                />
              </div>
            </div>
          </div>
          {hasWhatIf && (
            <Button variant="ghost" size="sm" className="text-xs" onClick={() => { setIncomeChange(''); setAdditionalExpense(''); }}>
              Limpiar escenario
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
