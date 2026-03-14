import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const KEYS = [
  { key: 'albert:groq_api_key', label: 'Groq API Key', placeholder: 'gsk_...', required: true },
  { key: 'albert:gemini_api_key', label: 'Gemini API Key (fallback)', placeholder: 'AIza...', required: false },
  { key: 'albert:tavily_api_key', label: 'Tavily API Key (búsqueda web)', placeholder: 'tvly-...', required: false },
] as const;

export function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  const [values, setValues] = useState<Record<string, string>>({});

  useEffect(() => {
    if (open) {
      const loaded: Record<string, string> = {};
      for (const k of KEYS) {
        loaded[k.key] = localStorage.getItem(k.key) || '';
      }
      setValues(loaded);
    }
  }, [open]);

  const handleSave = () => {
    for (const k of KEYS) {
      const val = values[k.key]?.trim() || '';
      if (val) {
        localStorage.setItem(k.key, val);
      } else {
        localStorage.removeItem(k.key);
      }
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Configuración de Albert</DialogTitle>
          <DialogDescription>
            Configura tus API keys para usar Albert. Se guardan localmente en tu navegador.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          {KEYS.map((k) => (
            <div key={k.key} className="space-y-1.5">
              <Label htmlFor={k.key} className="text-sm">
                {k.label}
                {k.required && <span className="text-destructive ml-1">*</span>}
              </Label>
              <Input
                id={k.key}
                type="password"
                placeholder={k.placeholder}
                value={values[k.key] || ''}
                onChange={(e) => setValues({ ...values, [k.key]: e.target.value })}
              />
            </div>
          ))}
          <div className="space-y-1.5">
            <Label htmlFor="model" className="text-sm">Modelo preferido</Label>
            <Input
              id="model"
              placeholder="llama-3.3-70b-versatile"
              defaultValue={localStorage.getItem('albert:preferred_model') || ''}
              onChange={(e) => {
                const val = e.target.value.trim();
                if (val) localStorage.setItem('albert:preferred_model', val);
                else localStorage.removeItem('albert:preferred_model');
              }}
            />
            <p className="text-[11px] text-muted-foreground">Para Groq. Default: llama-3.3-70b-versatile</p>
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave}>Guardar</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
