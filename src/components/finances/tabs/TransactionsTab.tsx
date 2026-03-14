import { useState, useMemo, useCallback } from 'react';
import { Plus, Pencil, Trash2, TrendingUp, TrendingDown, Clock, CheckCircle2, SlidersHorizontal, Repeat, Square, Download, X, Wallet, HelpCircle, CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, PAYMENT_METHODS, type Transaction } from '@/types';
import { TransactionForm } from '../shared/TransactionForm';
import { COP, CATEGORY_ICONS } from '../shared/constants';

interface TransactionsTabProps {
  transactions: Transaction[];
  addTransaction: (data: Omit<Transaction, 'id' | 'createdAt'>) => Promise<Transaction>;
  updateTransaction: (id: string, updates: Partial<Transaction>) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  stopRecurrence: (id: string) => Promise<void>;
  bulkDelete: (ids: string[]) => Promise<void>;
  bulkUpdate: (ids: string[], updates: Partial<Transaction>) => Promise<void>;
}

export function TransactionsTab({ transactions, addTransaction, updateTransaction, deleteTransaction, stopRecurrence, bulkDelete, bulkUpdate }: TransactionsTabProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all');
  const [filterDateFrom, setFilterDateFrom] = useState<Date | undefined>();
  const [filterDateTo, setFilterDateTo] = useState<Date | undefined>();
  const [dateMode, setDateMode] = useState<'single' | 'range'>('single');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'paid'>('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

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

  const openEdit = (tx: Transaction) => {
    setEditingTx(tx);
    setDialogOpen(true);
  };

  const handleSubmit = async (data: Omit<Transaction, 'id' | 'createdAt'>) => {
    if (editingTx) {
      await updateTransaction(editingTx.id, data);
    } else {
      await addTransaction(data);
    }
  };

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

  const exportCSV = useCallback(() => {
    const headers = ['Fecha', 'Tipo', 'Descripcion', 'Categoria', 'Cantidad', 'Estado', 'Metodo de Pago'];
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
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{transactions.length} transacciones</p>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={exportCSV}>
            <Download className="h-4 w-4" /> Exportar
          </Button>
          <TransactionForm
            open={dialogOpen}
            onOpenChange={setDialogOpen}
            editingTx={editingTx}
            onSubmit={handleSubmit}
            onReset={() => setEditingTx(null)}
            trigger={
              <Button size="sm" className="gap-1.5">
                <Plus className="h-4 w-4" /> Anadir
              </Button>
            }
          />
        </div>
      </div>

      {/* Filters */}
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
              <SelectTrigger className="w-[170px] h-8 text-xs"><SelectValue placeholder="Todas las categorias" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las categorias</SelectItem>
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
                  <button type="button" className={cn('flex-1 px-3 py-1.5 text-xs rounded-md font-medium transition-colors', dateMode === 'single' ? 'bg-muted' : 'text-muted-foreground hover:text-foreground')} onClick={() => { setDateMode('single'); setFilterDateFrom(undefined); setFilterDateTo(undefined); }}>Dia exacto</button>
                  <button type="button" className={cn('flex-1 px-3 py-1.5 text-xs rounded-md font-medium transition-colors', dateMode === 'range' ? 'bg-muted' : 'text-muted-foreground hover:text-foreground')} onClick={() => { setDateMode('range'); setFilterDateFrom(undefined); setFilterDateTo(undefined); }}>Rango de fechas</button>
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
              <Button variant="outline" size="sm" className="h-7 text-xs">Cambiar categoria</Button>
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
            <Checkbox checked={selectedIds.has(tx.id)} onCheckedChange={() => toggleSelect(tx.id)} className="h-4 w-4 shrink-0" />
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
                      <p className="px-2 py-1.5 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Marcar pagado via</p>
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
                      <p className="px-2 py-1.5 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Cambiar metodo</p>
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

      {transactions.length === 0 && (
        <div className="text-center py-16 text-muted-foreground text-sm">
          Aun no hay transacciones. Anade la primera.
        </div>
      )}
    </div>
  );
}
