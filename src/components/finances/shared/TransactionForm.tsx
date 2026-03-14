import { useState } from 'react';
import { Repeat, CalendarIcon, HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, PAYMENT_METHODS, RECURRENCE_OPTIONS, type Transaction, type PaymentStatus, type RecurrenceFrequency } from '@/types';
import { CATEGORY_ICONS } from './constants';

interface TransactionFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingTx: Transaction | null;
  onSubmit: (data: Omit<Transaction, 'id' | 'createdAt'>) => Promise<void>;
  onReset: () => void;
  trigger?: React.ReactNode;
}

export function TransactionForm({ open, onOpenChange, editingTx, onSubmit, onReset, trigger }: TransactionFormProps) {
  const [formType, setFormType] = useState<'income' | 'expense'>(editingTx?.type || 'expense');
  const [formAmount, setFormAmount] = useState(editingTx ? String(editingTx.amount) : '');
  const [formDesc, setFormDesc] = useState(editingTx?.description || '');
  const [formCategory, setFormCategory] = useState(editingTx?.category || '');
  const [formDate, setFormDate] = useState(editingTx?.date || new Date().toISOString().substring(0, 10));
  const [formPaymentMethod, setFormPaymentMethod] = useState(editingTx?.paymentMethod || '');
  const [formRecurrence, setFormRecurrence] = useState<RecurrenceFrequency>(editingTx?.recurrence || 'none');
  const [formRecurrenceEndDate, setFormRecurrenceEndDate] = useState(editingTx?.recurrenceEndDate || '');

  const categories = formType === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  // Reset form when editingTx changes
  const resetAndClose = () => {
    setFormType('expense');
    setFormAmount('');
    setFormDesc('');
    setFormCategory('');
    setFormDate(new Date().toISOString().substring(0, 10));
    setFormPaymentMethod('');
    setFormRecurrence('none');
    setFormRecurrenceEndDate('');
    onReset();
  };

  // Sync state with editingTx on open
  const handleOpenChange = (o: boolean) => {
    if (o && editingTx) {
      setFormType(editingTx.type);
      setFormAmount(String(editingTx.amount));
      setFormDesc(editingTx.description);
      setFormCategory(editingTx.category);
      setFormDate(editingTx.date);
      setFormPaymentMethod(editingTx.paymentMethod || '');
      setFormRecurrence(editingTx.recurrence || 'none');
      setFormRecurrenceEndDate(editingTx.recurrenceEndDate || '');
    }
    if (!o) resetAndClose();
    onOpenChange(o);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit({
      type: formType,
      amount: parseFloat(formAmount),
      description: formDesc,
      category: formCategory,
      date: formDate,
      status: (formType === 'expense' ? 'pending' : 'paid') as PaymentStatus,
      recurrence: formRecurrence,
      ...(formPaymentMethod ? { paymentMethod: formPaymentMethod } : {}),
      ...(formRecurrenceEndDate ? { recurrenceEndDate: formRecurrenceEndDate } : {}),
    });
    onOpenChange(false);
    resetAndClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editingTx ? 'Editar Transaccion' : 'Anadir Transaccion'}</DialogTitle>
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
          <Input value={formDesc} onChange={(e) => setFormDesc(e.target.value)} placeholder="Descripcion" required />
          <Select value={formCategory} onValueChange={setFormCategory} required>
            <SelectTrigger><SelectValue placeholder="Categoria" /></SelectTrigger>
            <SelectContent>
              {categories.map(c => {
                const Icon = CATEGORY_ICONS[c] || HelpCircle;
                return (<SelectItem key={c} value={c}><span className="flex items-center gap-2"><Icon className="h-3.5 w-3.5 text-muted-foreground" />{c}</span></SelectItem>);
              })}
            </SelectContent>
          </Select>
          <Select value={formPaymentMethod} onValueChange={setFormPaymentMethod}>
            <SelectTrigger><SelectValue placeholder="Metodo de pago" /></SelectTrigger>
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
          <Button type="submit" className="w-full">{editingTx ? 'Actualizar' : 'Anadir'}</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
