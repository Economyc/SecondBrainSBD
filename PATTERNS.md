# Patrones de Implementación — SecondBrain

Referencia de patrones ya establecidos en el proyecto. Antes de implementar algo nuevo, verifica si ya existe un patrón aquí.

---

## Drag & Drop (@dnd-kit)

**Archivos referencia:** `TaskList.tsx` (SortableTask), `TaskItem.tsx` (SortableSubtask)

### Patrón Sortable

```tsx
// 1. Wrapper div recibe TODOS los props de DnD
<div
  ref={setNodeRef}
  style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }}
  {...attributes}
  {...listeners}
  className={cn(isDragging ? 'z-10 relative' : '', 'cursor-grab active:cursor-grabbing')}
>
  {/* contenido */}
</div>

// 2. Elementos interactivos DENTRO del sortable usan stopPropagation
<div onPointerDown={(e) => e.stopPropagation()}>
  <Checkbox ... />
</div>

// 3. Sensors siempre con distance constraint
const sensors = useSensors(
  useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
);
```

**Reglas:**
- `{...listeners}` va en el wrapper div, NO en un ícono de grip
- El GripVertical es solo indicador visual, no recibe listeners
- `z-10 relative` cuando `isDragging` para que el item arrastrado quede encima
- `cursor-grab active:cursor-grabbing` en el wrapper
- Envolver checkbox, botones, popovers en `<div onPointerDown={stopPropagation}>` para que no inicien drag

---

## Columnas redimensionables (Pointer Capture)

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

// 4. Data rows: spacers de 12px donde el header tiene resize handles
<div className="flex items-center">
  <div className="flex-1">{name}</div>
  <div className="w-3 shrink-0" /> {/* matches resize handle width (12px) */}
  <div style={{ width: widths.column }}>{value}</div>
</div>
```

**Reglas:**
- Header y data rows deben tener el MISMO layout flex (sin `gap`, spacers explícitos)
- Resize handle: hit area de 12px (`w-3`), línea visual interna de 2px con `bg-border` (siempre visible), `bg-primary/50` en hover, `bg-primary` al arrastrar
- Estado `isDragging` con `useState` para controlar estilos — no manipular DOM directamente con `classList`
- Resize handle usa pointer capture para drag suave
- Anchos con min/max constraints y debounce en localStorage
- Double-click en handle resetea todos los anchos
- Spacers de 12px (`w-3`) en data rows para alinear con resize handles del header

---

## Firestore CRUD (hooks)

**Archivo referencia:** `useTasks.ts`, `useDocuments.ts`

### Patrón de Hook con Real-time

```tsx
export function useXxx() {
  const { environment } = useEnvironment();
  const [items, setItems] = useState<Item[]>([]);

  // Real-time listener
  useEffect(() => {
    const unsub = onSnapshot(getCol(environment, 'collection'), (snapshot) => {
      setItems(snapshot.docs.map(d => d.data() as Item));
    });
    return unsub;
  }, [environment]);

  // Operaciones CRUD con useCallback
  const addItem = useCallback(async (...) => {
    await setDoc(getDocRef(environment, 'collection', id), data);
  }, [environment]);

  return { items, addItem, ... };
}
```

**Reglas:**
- Siempre usar `useEnvironment()` para multi-environment
- `getCol` / `getDocRef` de `@/lib/firestore` para refs
- `onSnapshot` para real-time, cleanup en return del useEffect
- Todas las operaciones CRUD envueltas en `useCallback` con `[environment]` en deps

---

## Layout expandible

**Archivo referencia:** `TaskItem.tsx`

### Patrón de expansión con animación

```tsx
const [expanded, setExpanded] = useState(false);

// Toggle button
<Button onClick={() => setExpanded(!expanded)}>
  {expanded ? <ChevronDown /> : <ChevronRight />}
</Button>

// Contenido expandible
{expanded && (
  <div className="animate-in slide-in-from-top-1 duration-150">
    {/* contenido */}
  </div>
)}
```

**Reglas:**
- Renderizado condicional con `&&`, no con CSS display
- Animación `animate-in slide-in-from-top-1 duration-150`
- Grid condicional según contenido: `grid-cols-1 md:grid-cols-[1fr_280px]`

---

## Popover con opciones

**Archivo referencia:** `TaskItem.tsx` (Priority selector, Calendar selector)

```tsx
<Popover>
  <PopoverTrigger asChild>
    <button className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px]">
      {/* icono + label */}
    </button>
  </PopoverTrigger>
  <PopoverContent className="w-36 p-1" align="start">
    {options.map(opt => (
      <button className="w-full flex items-center gap-2 px-2 py-1.5 text-xs rounded-sm hover:bg-muted">
        {/* opción */}
      </button>
    ))}
  </PopoverContent>
</Popover>
```

**Reglas:**
- `asChild` en PopoverTrigger
- Trigger es `<button type="button">` nativo, no `<Button>` de shadcn
- Opciones como botones nativos con hover bg-muted
- Wrapper del popover con `onPointerDown={stopPropagation}` si está dentro de un sortable

---

## Formulario inline

**Archivo referencia:** `TaskList.tsx` (crear tarea), `TaskItem.tsx` (añadir subtarea)

```tsx
const [isCreating, setIsCreating] = useState(false);
const [title, setTitle] = useState('');

const resetForm = () => { setTitle(''); setIsCreating(false); };

// Escape handler en inputs
onKeyDown={(e) => { if (e.key === 'Escape') resetForm(); }}
```

**Reglas:**
- Estado `isCreating` para toggle de visibilidad del form
- Función `resetForm` que limpia todos los campos
- Escape handler en todos los inputs para cancelar
- Submit via `<form onSubmit>`, no onClick en botón
