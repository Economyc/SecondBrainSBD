# Resizable Task Columns Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add default spacing between task columns and allow users to resize columns by dragging separators, like Notion tables.

**Architecture:** A custom `useColumnWidths` hook manages column widths with localStorage persistence. The header row in `TaskList.tsx` gets draggable resize handles between columns. Both header and task rows read widths from a shared React context so they stay in sync. CSS variables on a container div propagate widths to all children.

**Tech Stack:** React state + context, pointer events for drag resize, localStorage for persistence, Tailwind for styling.

---

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `src/hooks/useColumnWidths.ts` | Create | Hook: manages column widths state, localStorage persistence, resize handlers |
| `src/contexts/ColumnWidthsContext.tsx` | Create | Context provider so TaskList and TaskItem share the same widths |
| `src/components/tasks/ColumnResizeHandle.tsx` | Create | The draggable divider component between column headers |
| `src/components/tasks/TaskList.tsx` | Modify | Wrap in context provider, add resize handles to header, use CSS vars |
| `src/components/tasks/TaskItem.tsx` | Modify | Replace hardcoded `w-[Xpx]` with CSS var widths from context |

---

## Chunk 1: Core Infrastructure

### Task 1: Create `useColumnWidths` hook

**Files:**
- Create: `src/hooks/useColumnWidths.ts`

- [ ] **Step 1: Create the hook file**

```ts
import { useState, useCallback, useEffect } from 'react';

export interface ColumnWidths {
  priority: number;
  date: number;
  subtasks: number;
}

const DEFAULT_WIDTHS: ColumnWidths = {
  priority: 100,  // was 76px — more breathing room
  date: 110,      // was 90px
  subtasks: 68,   // was 52px
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
```

- [ ] **Step 2: Verify no type errors**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useColumnWidths.ts
git commit -m "feat: add useColumnWidths hook with localStorage persistence"
```

---

### Task 2: Create `ColumnWidthsContext`

**Files:**
- Create: `src/contexts/ColumnWidthsContext.tsx`

- [ ] **Step 1: Create the context file**

```tsx
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
```

- [ ] **Step 2: Verify no type errors**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add src/contexts/ColumnWidthsContext.tsx
git commit -m "feat: add ColumnWidthsContext for sharing column widths"
```

---

### Task 3: Create `ColumnResizeHandle` component

**Files:**
- Create: `src/components/tasks/ColumnResizeHandle.tsx`

- [ ] **Step 1: Create the resize handle component**

This component renders a thin vertical bar between column headers. On pointer down, it starts tracking horizontal movement and calls `onResize` with the delta.

```tsx
import { useCallback, useRef } from 'react';
import { cn } from '@/lib/utils';

interface ColumnResizeHandleProps {
  onResize: (delta: number) => void;
  className?: string;
}

export function ColumnResizeHandle({ onResize, className }: ColumnResizeHandleProps) {
  const startXRef = useRef(0);
  const isDraggingRef = useRef(false);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    startXRef.current = e.clientX;
    isDraggingRef.current = true;
    const target = e.currentTarget as HTMLElement;
    target.setPointerCapture(e.pointerId);
    target.classList.add('bg-primary/40');
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDraggingRef.current) return;
    const delta = e.clientX - startXRef.current;
    if (Math.abs(delta) >= 1) {
      onResize(delta);
      startXRef.current = e.clientX;
    }
  }, [onResize]);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    isDraggingRef.current = false;
    const target = e.currentTarget as HTMLElement;
    target.releasePointerCapture(e.pointerId);
    target.classList.remove('bg-primary/40');
  }, []);

  return (
    <div
      className={cn(
        'w-[3px] shrink-0 self-stretch cursor-col-resize rounded-full',
        'hover:bg-primary/30 active:bg-primary/40 transition-colors',
        className
      )}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    />
  );
}
```

- [ ] **Step 2: Verify no type errors**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add src/components/tasks/ColumnResizeHandle.tsx
git commit -m "feat: add ColumnResizeHandle component for drag-to-resize"
```

---

## Chunk 2: Integration

### Task 4: Update `TaskList.tsx` — Provider + resizable header

**Files:**
- Modify: `src/components/tasks/TaskList.tsx`

- [ ] **Step 1: Add imports**

Add at the top of TaskList.tsx:
```tsx
import { useColumnWidths } from '@/hooks/useColumnWidths';
import { ColumnWidthsProvider } from '@/contexts/ColumnWidthsContext';
import { ColumnResizeHandle } from './ColumnResizeHandle';
```

- [ ] **Step 2: Initialize hook and wrap return in provider**

Inside `TaskList` function, after existing hooks:
```tsx
const columnWidthsHook = useColumnWidths();
const { widths, resize } = columnWidthsHook;
```

Wrap the entire return JSX with `<ColumnWidthsProvider value={columnWidthsHook}>...</ColumnWidthsProvider>`.

- [ ] **Step 3: Replace column header with resizable version**

Replace the column header block (lines 276-285):
```tsx
{/* Column header */}
{sortedTasks.length > 0 && (
  <div className="flex items-center gap-2 px-3 py-1.5 text-[11px] text-muted-foreground uppercase tracking-wider font-medium select-none">
    <div className="shrink-0 w-4" /> {/* checkbox spacer */}
    <div className="flex-1 min-w-0">Nombre</div>
    <div className="w-[76px] shrink-0 text-center">Prioridad</div>
    <div className="w-[90px] shrink-0 text-center">Fecha</div>
    <div className="w-[52px] shrink-0 text-center">Subtareas</div>
    <div className="w-[52px] shrink-0" /> {/* actions spacer */}
  </div>
)}
```

With:
```tsx
{/* Column header */}
{sortedTasks.length > 0 && (
  <div className="flex items-center px-3 py-1.5 text-[11px] text-muted-foreground uppercase tracking-wider font-medium select-none">
    <div className="shrink-0 w-4 mr-2" /> {/* checkbox spacer */}
    <div className="flex-1 min-w-0">Nombre</div>
    <ColumnResizeHandle onResize={(d) => resize('priority', d)} />
    <div style={{ width: widths.priority }} className="shrink-0 text-center">Prioridad</div>
    <ColumnResizeHandle onResize={(d) => resize('date', d)} />
    <div style={{ width: widths.date }} className="shrink-0 text-center">Fecha</div>
    <ColumnResizeHandle onResize={(d) => resize('subtasks', d)} />
    <div style={{ width: widths.subtasks }} className="shrink-0 text-center">Subtareas</div>
    <div className="w-[56px] shrink-0" /> {/* actions spacer — fixed, not resizable */}
  </div>
)}
```

Note: `gap-2` removed from the header flex, spacing is now controlled by the resize handles acting as dividers. The `mr-2` on checkbox spacer maintains the gap before the name column.

- [ ] **Step 4: Verify no type errors**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 5: Commit**

```bash
git add src/components/tasks/TaskList.tsx
git commit -m "feat: add resizable column headers with drag handles"
```

---

### Task 5: Update `TaskItem.tsx` — Use context widths

**Files:**
- Modify: `src/components/tasks/TaskItem.tsx`

- [ ] **Step 1: Add import**

```tsx
import { useColumnWidthsContext } from '@/contexts/ColumnWidthsContext';
```

- [ ] **Step 2: Use context inside TaskItem**

At the top of `TaskItem` function body, add:
```tsx
const { widths } = useColumnWidthsContext();
```

- [ ] **Step 3: Fix gap alignment between header and data rows (CRITICAL)**

The header removes `gap-2` and uses 3px resize handles as spacers. The TaskItem row MUST also remove `gap-2` and add matching 3px invisible spacers at the same positions. Otherwise columns won't align.

**Change the main row div** (currently line ~123):
```tsx
// Before:
<div className="flex items-center gap-2 px-3 py-2">
// After:
<div className="flex items-center px-3 py-2">
```

Then add `mr-2` to the checkbox wrapper to maintain the gap before the name column:
```tsx
// Before:
<div className="shrink-0" onPointerDown={(e) => e.stopPropagation()}>
// After:
<div className="shrink-0 mr-2" onPointerDown={(e) => e.stopPropagation()}>
```

- [ ] **Step 4: Replace hardcoded widths with dynamic widths + add spacers**

Replace hardcoded Tailwind width classes AND add 3px spacer divs between Name→Priority, Priority→Date, Date→Subtasks to match the header's resize handles:

**Between Name and Priority** — add a spacer div after the name `</div>`:
```tsx
<div className="w-[3px] shrink-0" /> {/* spacer — matches resize handle in header */}
```

**Priority column** (currently line ~156):
```tsx
// Before:
<div className="w-[76px] shrink-0" onPointerDown={(e) => e.stopPropagation()}>
// After:
<div style={{ width: widths.priority }} className="shrink-0" onPointerDown={(e) => e.stopPropagation()}>
```

**Between Priority and Date** — add spacer:
```tsx
<div className="w-[3px] shrink-0" /> {/* spacer — matches resize handle in header */}
```

**Date column** (currently line ~189):
```tsx
// Before:
<div className="w-[90px] shrink-0 text-center" onPointerDown={(e) => e.stopPropagation()}>
// After:
<div style={{ width: widths.date }} className="shrink-0 text-center" onPointerDown={(e) => e.stopPropagation()}>
```

**Between Date and Subtasks** — add spacer:
```tsx
<div className="w-[3px] shrink-0" /> {/* spacer — matches resize handle in header */}
```

**Subtask count column** (currently line ~223):
```tsx
// Before:
<div className="w-[52px] shrink-0 text-center">
// After:
<div style={{ width: widths.subtasks }} className="shrink-0 text-center">
```

**Actions column** — no width change needed (auto-sizes from content, no resize handle above it).

- [ ] **Step 5: Verify no type errors**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 6: Visual verification**

1. Open the app → task list should show columns with more breathing room (100px priority, 110px date, 68px subtasks vs the old 76/90/52)
2. Verify columns ALIGN between header and data rows (critical — the spacers must match resize handles)
3. Hover between column headers → resize handle should highlight
4. Drag a resize handle → column should resize in real-time
5. Refresh the page → column widths should persist from localStorage
6. Checkbox, priority popover, date popover, delete button should all still work (stopPropagation intact)
7. DnD of tasks and subtasks should still work

- [ ] **Step 7: Commit**

```bash
git add src/components/tasks/TaskItem.tsx
git commit -m "feat: use dynamic column widths from context in TaskItem"
```

---

## Chunk 3: Polish

### Task 6: Double-click to reset column width

**Files:**
- Modify: `src/components/tasks/ColumnResizeHandle.tsx`

- [ ] **Step 1: Add double-click reset**

Add an `onDoubleClick` handler to the resize handle div that calls a new `onReset` prop:

```tsx
interface ColumnResizeHandleProps {
  onResize: (delta: number) => void;
  onReset?: () => void;
  className?: string;
}
```

Add to the div:
```tsx
onDoubleClick={(e) => {
  e.stopPropagation();
  onReset?.();
}}
```

- [ ] **Step 2: Wire reset in TaskList header**

In TaskList.tsx, update the ColumnResizeHandle calls to include `onReset`:
```tsx
<ColumnResizeHandle onResize={(d) => resize('priority', d)} onReset={resetWidths} />
<ColumnResizeHandle onResize={(d) => resize('date', d)} onReset={resetWidths} />
<ColumnResizeHandle onResize={(d) => resize('subtasks', d)} onReset={resetWidths} />
```

- [ ] **Step 3: Verify + Commit**

Run: `npx tsc --noEmit`
Test: double-click any resize handle → all columns reset to defaults.

```bash
git add src/components/tasks/ColumnResizeHandle.tsx src/components/tasks/TaskList.tsx
git commit -m "feat: double-click resize handle to reset column widths"
```

---

### Task 7: Update `PATTERNS.md` — Document Resizable Columns pattern

**Files:**
- Modify: `PATTERNS.md`

- [ ] **Step 1: Add Resizable Columns section to PATTERNS.md**

Add a new section after the existing "Drag & Drop (@dnd-kit)" section:

```markdown
---

## Resizable Columns (Pointer Capture)

**Archivos referencia:** `ColumnResizeHandle.tsx`, `useColumnWidths.ts`, `ColumnWidthsContext.tsx`

### Patrón de columnas redimensionables

```tsx
// 1. Hook maneja anchos con persistencia en localStorage
const { widths, resize, resetWidths } = useColumnWidths();

// 2. Context comparte los anchos entre header y filas de datos
<ColumnWidthsProvider value={columnWidthsHook}>
  {/* header + rows */}
</ColumnWidthsProvider>

// 3. Header: resize handles entre columnas
<div className="flex items-center">
  <div className="flex-1">Nombre</div>
  <ColumnResizeHandle onResize={(d) => resize('column', d)} onReset={resetWidths} />
  <div style={{ width: widths.column }}>Columna</div>
</div>

// 4. Data rows: spacers invisibles de 3px donde el header tiene resize handles
<div className="flex items-center">
  <div className="flex-1">{name}</div>
  <div className="w-[3px] shrink-0" /> {/* matches resize handle */}
  <div style={{ width: widths.column }}>{value}</div>
</div>
```

**Reglas:**
- Header y data rows deben tener el MISMO layout flex (sin `gap`, spacers explícitos)
- Resize handle usa pointer capture para drag suave
- Anchos con min/max constraints y debounce en localStorage
- Double-click en handle resetea todos los anchos
- Spacers invisibles (3px) en data rows para alinear con resize handles del header
```

- [ ] **Step 2: Commit**

```bash
git add PATTERNS.md
git commit -m "docs: add resizable columns pattern to PATTERNS.md"
```

---

## Verification Checklist

- [ ] `npx tsc --noEmit` passes
- [ ] Columns have more default spacing than before
- [ ] Dragging resize handles between headers resizes columns
- [ ] Widths persist across page refresh (localStorage)
- [ ] Double-click handle resets all widths to defaults
- [ ] Task DnD still works
- [ ] Subtask DnD still works
- [ ] All interactive elements (checkbox, priority, date, delete) still work
- [ ] Expanded task panel still renders correctly
