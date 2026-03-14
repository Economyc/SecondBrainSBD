import { useState } from 'react';
import { Plus, Pencil, Trash2, ChevronDown, TrendingUp, TrendingDown, Landmark, BarChart3, PiggyBank } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import type { Investment, InvestmentType, InvestmentEntry } from '@/types';
import { INVESTMENT_TYPES } from '@/types';
import { SummaryCard } from '../shared/SummaryCard';
import { COP, PIE_COLORS } from '../shared/constants';

interface InvestmentsTabProps {
  investments: Investment[];
  portfolioSummary: { totalInvested: number; totalCurrentValue: number; totalROI: number; roiPercent: number };
  addInvestment: (data: Omit<Investment, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Investment>;
  updateInvestment: (id: string, updates: Partial<Investment>) => Promise<void>;
  deleteInvestment: (id: string) => Promise<void>;
  addEntry: (investmentId: string, entry: Omit<InvestmentEntry, 'id'>) => Promise<void>;
  deleteEntry: (investmentId: string, entryId: string) => Promise<void>;
}

const ENTRY_TYPE_LABELS: Record<string, string> = { buy: 'Compra', sell: 'Venta', dividend: 'Dividendo', valuation: 'Valoracion' };

export function InvestmentsTab({ investments, portfolioSummary, addInvestment, updateInvestment, deleteInvestment, addEntry, deleteEntry }: InvestmentsTabProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [entryDialogOpen, setEntryDialogOpen] = useState(false);
  const [editingInv, setEditingInv] = useState<Investment | null>(null);
  const [selectedInvId, setSelectedInvId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Investment form
  const [formName, setFormName] = useState('');
  const [formType, setFormType] = useState<InvestmentType>('stocks');
  const [formCurrentValue, setFormCurrentValue] = useState('');
  const [formNotes, setFormNotes] = useState('');

  // Entry form
  const [entryType, setEntryType] = useState<'buy' | 'sell' | 'dividend' | 'valuation'>('buy');
  const [entryAmount, setEntryAmount] = useState('');
  const [entryUnits, setEntryUnits] = useState('');
  const [entryPrice, setEntryPrice] = useState('');
  const [entryDate, setEntryDate] = useState(new Date().toISOString().substring(0, 10));
  const [entryNotes, setEntryNotes] = useState('');

  const resetForm = () => {
    setFormName('');
    setFormType('stocks');
    setFormCurrentValue('');
    setFormNotes('');
    setEditingInv(null);
  };

  const resetEntryForm = () => {
    setEntryType('buy');
    setEntryAmount('');
    setEntryUnits('');
    setEntryPrice('');
    setEntryDate(new Date().toISOString().substring(0, 10));
    setEntryNotes('');
  };

  const openEdit = (inv: Investment) => {
    setEditingInv(inv);
    setFormName(inv.name);
    setFormType(inv.type);
    setFormCurrentValue(String(inv.currentValue));
    setFormNotes(inv.notes || '');
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const data = {
      name: formName,
      type: formType,
      currentValue: parseFloat(formCurrentValue) || 0,
      entries: editingInv?.entries || [],
      ...(formNotes ? { notes: formNotes } : {}),
    };
    if (editingInv) {
      await updateInvestment(editingInv.id, data);
    } else {
      await addInvestment(data);
    }
    setDialogOpen(false);
    resetForm();
  };

  const handleEntrySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvId) return;
    await addEntry(selectedInvId, {
      type: entryType,
      totalAmount: parseFloat(entryAmount),
      date: entryDate,
      ...(entryUnits ? { units: parseFloat(entryUnits) } : {}),
      ...(entryPrice ? { pricePerUnit: parseFloat(entryPrice) } : {}),
      ...(entryNotes ? { notes: entryNotes } : {}),
    });
    setEntryDialogOpen(false);
    resetEntryForm();
  };

  // Portfolio distribution by type
  const typeDistribution = investments.reduce((acc, inv) => {
    const label = INVESTMENT_TYPES.find(t => t.value === inv.type)?.label || inv.type;
    const existing = acc.find(a => a.name === label);
    if (existing) existing.value += inv.currentValue;
    else acc.push({ name: label, value: inv.currentValue });
    return acc;
  }, [] as { name: string; value: number }[]).sort((a, b) => b.value - a.value);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <SummaryCard icon={PiggyBank} title="Total Invertido" value={COP(portfolioSummary.totalInvested)} />
        <SummaryCard icon={Landmark} title="Valor Actual" value={COP(portfolioSummary.totalCurrentValue)} />
        <SummaryCard icon={BarChart3} title="ROI" value={COP(portfolioSummary.totalROI)} valueClassName={cn(portfolioSummary.totalROI < 0 && 'text-destructive')} />
        <SummaryCard icon={TrendingUp} title="ROI %" value={`${portfolioSummary.roiPercent}%`} valueClassName={cn(portfolioSummary.roiPercent < 0 && 'text-destructive')} />
      </div>

      {/* Header + Add */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{investments.length} inversiones</p>
        <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) resetForm(); }}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1.5"><Plus className="h-4 w-4" /> Anadir Inversion</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{editingInv ? 'Editar Inversion' : 'Anadir Inversion'}</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="Nombre" required />
              <Select value={formType} onValueChange={(v) => setFormType(v as InvestmentType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {INVESTMENT_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
                <Input
                  className="pl-7"
                  inputMode="numeric"
                  value={formCurrentValue ? Number(formCurrentValue).toLocaleString('es-CO') : ''}
                  onChange={(e) => setFormCurrentValue(e.target.value.replace(/[^0-9]/g, '') || '')}
                  placeholder="Valor actual"
                  required
                />
              </div>
              <Input value={formNotes} onChange={(e) => setFormNotes(e.target.value)} placeholder="Notas (opcional)" />
              <Button type="submit" className="w-full">{editingInv ? 'Actualizar' : 'Crear'}</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Portfolio Distribution Pie */}
      {typeDistribution.length > 1 && (
        <Card>
          <CardHeader><CardTitle className="text-sm font-medium">Distribucion del Portafolio</CardTitle></CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <ResponsiveContainer width={160} height={160}>
                <PieChart>
                  <Pie data={typeDistribution} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={2}>
                    {typeDistribution.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => COP(v)} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-1.5">
                {typeDistribution.map((item, i) => (
                  <div key={item.name} className="flex items-center gap-2 text-xs">
                    <div className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                    <span className="truncate flex-1">{item.name}</span>
                    <span className="text-muted-foreground shrink-0">{COP(item.value)}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Investments List */}
      {investments.length > 0 ? (
        <div className="space-y-2">
          {investments.map(inv => {
            const typeLabel = INVESTMENT_TYPES.find(t => t.value === inv.type)?.label || inv.type;
            const buys = inv.entries.filter(e => e.type === 'buy').reduce((s, e) => s + e.totalAmount, 0);
            const sells = inv.entries.filter(e => e.type === 'sell').reduce((s, e) => s + e.totalAmount, 0);
            const invested = buys - sells;
            const roi = inv.currentValue - invested;
            const roiPercent = invested > 0 ? Math.round((roi / invested) * 100) : 0;

            return (
              <Collapsible key={inv.id} open={expandedId === inv.id} onOpenChange={(o) => setExpandedId(o ? inv.id : null)}>
                <div className="border rounded-lg">
                  <CollapsibleTrigger asChild>
                    <div className="group flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-muted/30 transition-colors">
                      <ChevronDown className={cn('h-4 w-4 transition-transform', expandedId === inv.id && 'rotate-180')} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium truncate">{inv.name}</p>
                          <Badge variant="secondary" className="text-[10px]">{typeLabel}</Badge>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-medium">{COP(inv.currentValue)}</p>
                        <p className={cn('text-[10px]', roi >= 0 ? 'text-chart-2' : 'text-destructive')}>
                          {roi >= 0 ? '+' : ''}{COP(roi)} ({roiPercent}%)
                        </p>
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); openEdit(inv); }}><Pencil className="h-3 w-3" /></Button>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); deleteInvestment(inv.id); }}><Trash2 className="h-3 w-3" /></Button>
                      </div>
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="border-t px-4 py-3 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">{inv.entries.length} movimientos</span>
                        <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => { setSelectedInvId(inv.id); setEntryDialogOpen(true); }}>
                          <Plus className="h-3 w-3" /> Movimiento
                        </Button>
                      </div>
                      {inv.entries.length > 0 && (
                        <div className="space-y-1">
                          {[...inv.entries].sort((a, b) => b.date.localeCompare(a.date)).map(entry => (
                            <div key={entry.id} className="group/entry flex items-center gap-3 px-2 py-1.5 rounded hover:bg-muted/30 text-xs">
                              <Badge variant={entry.type === 'sell' ? 'destructive' : 'secondary'} className="text-[10px] w-20 justify-center">
                                {ENTRY_TYPE_LABELS[entry.type]}
                              </Badge>
                              <span className="text-muted-foreground">{entry.date}</span>
                              {entry.units && <span>{entry.units} uds</span>}
                              <span className="ml-auto font-medium">{COP(entry.totalAmount)}</span>
                              <Button variant="ghost" size="icon" className="h-5 w-5 opacity-0 group-hover/entry:opacity-100" onClick={() => deleteEntry(inv.id, entry.id)}>
                                <Trash2 className="h-2.5 w-2.5" />
                              </Button>
                            </div>
                          ))}
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
          No hay inversiones. Anade la primera.
        </div>
      )}

      {/* Entry Dialog */}
      <Dialog open={entryDialogOpen} onOpenChange={(o) => { setEntryDialogOpen(o); if (!o) resetEntryForm(); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Anadir Movimiento</DialogTitle></DialogHeader>
          <form onSubmit={handleEntrySubmit} className="space-y-4">
            <Select value={entryType} onValueChange={(v) => setEntryType(v as 'buy' | 'sell' | 'dividend' | 'valuation')}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="buy">Compra</SelectItem>
                <SelectItem value="sell">Venta</SelectItem>
                <SelectItem value="dividend">Dividendo</SelectItem>
                <SelectItem value="valuation">Valoracion</SelectItem>
              </SelectContent>
            </Select>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
              <Input
                className="pl-7"
                inputMode="numeric"
                value={entryAmount ? Number(entryAmount).toLocaleString('es-CO') : ''}
                onChange={(e) => setEntryAmount(e.target.value.replace(/[^0-9]/g, '') || '')}
                placeholder="Monto total"
                required
              />
            </div>
            {(entryType === 'buy' || entryType === 'sell') && (
              <div className="grid grid-cols-2 gap-2">
                <Input inputMode="decimal" value={entryUnits} onChange={(e) => setEntryUnits(e.target.value)} placeholder="Unidades (opc)" />
                <Input inputMode="decimal" value={entryPrice} onChange={(e) => setEntryPrice(e.target.value)} placeholder="Precio/ud (opc)" />
              </div>
            )}
            <Input type="date" value={entryDate} onChange={(e) => setEntryDate(e.target.value)} required />
            <Input value={entryNotes} onChange={(e) => setEntryNotes(e.target.value)} placeholder="Notas (opcional)" />
            <Button type="submit" className="w-full">Anadir</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
