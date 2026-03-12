import { useState, useCallback, useEffect } from 'react';

export interface ColumnWidths {
  priority: number;
  date: number;
  subtasks: number;
}

const DEFAULT_WIDTHS: ColumnWidths = {
  priority: 100,
  date: 110,
  subtasks: 68,
};

const MIN_WIDTHS: ColumnWidths = {
  priority: 60,
  date: 70,
  subtasks: 50,
};

const MAX_WIDTHS: ColumnWidths = {
  priority: 300,
  date: 300,
  subtasks: 200,
};

const STORAGE_KEY = 'sb-task-column-widths';

function loadWidths(): ColumnWidths {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return { ...DEFAULT_WIDTHS, ...parsed };
    }
  } catch { /* ignore */ }
  return { ...DEFAULT_WIDTHS };
}

function saveWidths(widths: ColumnWidths) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(widths));
  } catch { /* ignore */ }
}

export function useColumnWidths() {
  const [widths, setWidths] = useState<ColumnWidths>(loadWidths);

  // Debounce localStorage writes to avoid 60+ writes/sec during drag
  useEffect(() => {
    const timer = setTimeout(() => saveWidths(widths), 300);
    return () => clearTimeout(timer);
  }, [widths]);

  const resize = useCallback((column: keyof ColumnWidths, delta: number) => {
    setWidths(prev => ({
      ...prev,
      [column]: Math.min(MAX_WIDTHS[column], Math.max(MIN_WIDTHS[column], prev[column] + delta)),
    }));
  }, []);

  const resetWidths = useCallback(() => {
    setWidths({ ...DEFAULT_WIDTHS });
  }, []);

  return { widths, resize, resetWidths };
}
