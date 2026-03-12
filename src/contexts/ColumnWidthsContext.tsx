import { createContext, useContext } from 'react';
import type { ColumnWidths } from '@/hooks/useColumnWidths';

interface ColumnWidthsContextValue {
  widths: ColumnWidths;
  resize: (column: keyof ColumnWidths, delta: number) => void;
  resetWidths: () => void;
}

const ColumnWidthsContext = createContext<ColumnWidthsContextValue | null>(null);

export const ColumnWidthsProvider = ColumnWidthsContext.Provider;

export function useColumnWidthsContext() {
  const ctx = useContext(ColumnWidthsContext);
  if (!ctx) throw new Error('useColumnWidthsContext must be used within ColumnWidthsProvider');
  return ctx;
}
