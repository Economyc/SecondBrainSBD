import { useState, useRef, useEffect, useMemo } from 'react';
import { Plus, X, CalendarIcon, ListChecks, Trash2, Flag, Filter, ArrowUpDown } from 'lucide-react';
import { format } from 'date-fns';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useTasks } from '@/hooks/useTasks';
import { useColumnWidths } from '@/hooks/useColumnWidths';
import { ColumnWidthsProvider } from '@/contexts/ColumnWidthsContext';
import { TaskItem } from './TaskItem';
import { ColumnResizeHandle } from './ColumnResizeHandle';
import type { Task, TaskPriority } from '@/types';

const PRIORITY_CONFIG: Record<TaskPriority, { label: string; className: string }> = {
  none: { label: 'Sin prioridad', className: 'text-muted-foreground' },
  low: { label: 'Baja', className: 'text-priority-low' },
  medium: { label: 'Media', className: 'text-priority-medium' },
  high: { label: 'Alta', className: 'text-priority-high' },
};

type SortMode = 'manual' | 'priority' | 'dueDate' | 'created';
type FilterMode = 'all' | 'high' | 'medium' | 'low' | 'hasDueDate';

function SortableTask({ task, hooks }: { task: Task; hooks: ReturnType<typeof useTasks> }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners} className={cn(isDragging ? 'z-10 relative' : '', 'cursor-grab active:cursor-grabbing')}>
      <TaskItem task={task} hooks={hooks} />
    </div>
  );
}

export function TaskList() {
  const hooks = useTasks();
  const { activeTasks, completedTasks, addTask, reorderTasks } = hooks;
  const columnWidthsHook = useColumnWidths();
  const { widths, resize, resetWidths } = columnWidthsHook;
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newSubtasks, setNewSubtasks] = useState<string[]>([]);
  const [newSubtaskInput, setNewSubtaskInput] = useState('');
  const [newTaskDueDate, setNewTaskDueDate] = useState<Date | undefined>();
  const [newTaskPriority, setNewTaskPriority] = useState<TaskPriority>('none');
  const [showSubtaskField, setShowSubtaskField] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);
  const [sortMode, setSortMode] = useState<SortMode>('manual');
  const [filterMode, setFilterMode] = useState<FilterMode>('all');
  const titleInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isCreating && titleInputRef.current) {
      titleInputRef.current.focus();
    }
  }, [isCreating]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isCreating) {
        resetForm();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isCreating]);

  const resetForm = () => {
    setNewTaskTitle('');
    setNewSubtasks([]);
    setNewSubtaskInput('');
    setNewTaskDueDate(undefined);
    setNewTaskPriority('none');
    setShowSubtaskField(false);
    setIsCreating(false);
  };

  const handleAddSubtask = () => {
    if (newSubtaskInput.trim()) {
      setNewSubtasks(prev => [...prev, newSubtaskInput.trim()]);
      setNewSubtaskInput('');
    }
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = activeTasks.findIndex(t => t.id === active.id);
      const newIndex = activeTasks.findIndex(t => t.id === over.id);
      const reordered = [...activeTasks];
      const [moved] = reordered.splice(oldIndex, 1);
      reordered.splice(newIndex, 0, moved);
      reorderTasks([...reordered, ...completedTasks]);
    }
  };

  const filteredTasks = useMemo(() => {
    let tasks = [...activeTasks];
    if (filterMode === 'high') tasks = tasks.filter(t => t.priority === 'high');
    else if (filterMode === 'medium') tasks = tasks.filter(t => t.priority === 'medium');
    else if (filterMode === 'low') tasks = tasks.filter(t => t.priority === 'low');
    else if (filterMode === 'hasDueDate') tasks = tasks.filter(t => t.dueDate);
    return tasks;
  }, [activeTasks, filterMode]);

  const sortedTasks = useMemo(() => {
    if (sortMode === 'manual') return filteredTasks;
    const priorityOrder: Record<string, number> = { high: 0, medium: 1, low: 2, none: 3 };
    return [...filteredTasks].sort((a, b) => {
      if (sortMode === 'priority') return (priorityOrder[a.priority || 'none'] ?? 3) - (priorityOrder[b.priority || 'none'] ?? 3);
      if (sortMode === 'dueDate') {
        if (!a.dueDate && !b.dueDate) return 0;
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return a.dueDate.localeCompare(b.dueDate);
      }
      if (sortMode === 'created') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      return 0;
    });
  }, [filteredTasks, sortMode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newTaskTitle.trim()) {
      const task = await addTask(newTaskTitle.trim(), '', newTaskPriority);
      if (newTaskDueDate) {
        hooks.updateTask(task.id, { dueDate: newTaskDueDate.toISOString().substring(0, 10) });
      }
      newSubtasks.forEach(st => hooks.addSubtask(task.id, st));
      resetForm();
    }
  };

  return (
    <ColumnWidthsProvider value={columnWidthsHook}>
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Tareas</h1>
          <p className="text-sm text-muted-foreground">
            {activeTasks.length} activas · {completedTasks.length} completadas
          </p>
        </div>
        <div className="flex items-center gap-1">
          {/* Sort */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant={sortMode !== 'manual' ? 'secondary' : 'ghost'} size="sm" className="h-8 gap-1.5 text-xs">
                <ArrowUpDown className="h-3.5 w-3.5" />
                {sortMode !== 'manual' && <span className="hidden sm:inline">{sortMode === 'priority' ? 'Prioridad' : sortMode === 'dueDate' ? 'Fecha' : 'Creada'}</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-40 p-1" align="end">
              {([['manual', 'Manual'], ['priority', 'Prioridad'], ['dueDate', 'Fecha'], ['created', 'Creada']] as [SortMode, string][]).map(([value, label]) => (
                <button key={value} className={cn('w-full text-left px-2 py-1.5 text-xs rounded-sm hover:bg-muted transition-colors', sortMode === value && 'bg-muted')} onClick={() => setSortMode(value)}>
                  {label}
                </button>
              ))}
            </PopoverContent>
          </Popover>
          {/* Filter */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant={filterMode !== 'all' ? 'secondary' : 'ghost'} size="sm" className="h-8 gap-1.5 text-xs">
                <Filter className="h-3.5 w-3.5" />
                {filterMode !== 'all' && <span className="hidden sm:inline">{filterMode === 'hasDueDate' ? 'Con fecha de vto' : filterMode}</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-40 p-1" align="end">
              {([['all', 'Todas'], ['high', 'Prioridad alta'], ['medium', 'Prioridad media'], ['low', 'Prioridad baja'], ['hasDueDate', 'Con fecha de vto']] as [FilterMode, string][]).map(([value, label]) => (
                <button key={value} className={cn('w-full text-left px-2 py-1.5 text-xs rounded-sm hover:bg-muted transition-colors', filterMode === value && 'bg-muted')} onClick={() => setFilterMode(value)}>
                  {label}
                </button>
              ))}
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Add task */}
      {!isCreating ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="gap-1.5 text-muted-foreground hover:text-foreground btn-press"
          onClick={() => setIsCreating(true)}
        >
          <Plus className="h-3.5 w-3.5" />
          Nueva tarea
        </Button>
      ) : (
        <form
          className="px-0 py-2 space-y-3 animate-in slide-in-from-top-2 duration-200"
          onSubmit={handleSubmit}
        >
          <Input
            ref={titleInputRef}
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
            placeholder="Nueva tarea"
            className="h-10 border-0 px-0 text-xl font-bold focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground/30"
          />

          <div className="flex items-center gap-1 flex-wrap">
            <Button type="button" variant={showSubtaskField ? 'secondary' : 'ghost'} size="sm" className="h-7 text-xs gap-1 btn-press" onClick={() => setShowSubtaskField(!showSubtaskField)}>
              <ListChecks className="h-3 w-3" /> Subtareas
            </Button>
            <Popover>
              <PopoverTrigger asChild>
                <Button type="button" variant={newTaskPriority !== 'none' ? 'secondary' : 'ghost'} size="sm" className={cn('h-7 text-xs gap-1 btn-press', PRIORITY_CONFIG[newTaskPriority].className)}>
                  <Flag className="h-3 w-3" fill={newTaskPriority === 'none' ? 'none' : 'currentColor'} />
                  {newTaskPriority === 'none' ? 'Prioridad' : PRIORITY_CONFIG[newTaskPriority].label}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-36 p-1" align="start">
                {(['none', 'low', 'medium', 'high'] as TaskPriority[]).map(p => (
                  <button key={p} type="button" className={cn('w-full flex items-center gap-2 px-2 py-1.5 text-xs rounded-sm hover:bg-muted transition-colors', newTaskPriority === p && 'bg-muted')} onClick={() => setNewTaskPriority(p)}>
                    <Flag className={cn('h-3 w-3', PRIORITY_CONFIG[p].className)} fill={p === 'none' ? 'none' : 'currentColor'} />
                    {PRIORITY_CONFIG[p].label}
                  </button>
                ))}
              </PopoverContent>
            </Popover>
          </div>

          {showSubtaskField && (
            <div className="space-y-2 animate-in slide-in-from-top-1 duration-150 max-w-sm">
              {newSubtasks.map((st, i) => (
                <div key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <div className="h-3.5 w-3.5 rounded-sm border border-muted-foreground/30 shrink-0" />
                  <span className="flex-1">{st}</span>
                  <Button type="button" variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setNewSubtasks(prev => prev.filter((_, idx) => idx !== i))}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
              <div className="flex gap-2">
                <Input value={newSubtaskInput} onChange={(e) => setNewSubtaskInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddSubtask(); } }} placeholder="Añadir subtarea..." className="h-8 text-sm" />
                <Button type="button" variant="outline" size="sm" className="h-8 btn-press" onClick={handleAddSubtask}><Plus className="h-3 w-3" /></Button>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between pt-1 border-t border-border">
            <Popover>
              <PopoverTrigger asChild>
                <Button type="button" variant="ghost" size="sm" className={cn('h-8 text-xs gap-1.5 font-normal', !newTaskDueDate && 'text-muted-foreground')}>
                  <CalendarIcon className="h-3.5 w-3.5" />
                  {newTaskDueDate ? format(newTaskDueDate, 'PPP') : 'Fecha'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={newTaskDueDate} onSelect={setNewTaskDueDate} initialFocus className={cn('p-3 pointer-events-auto')} />
              </PopoverContent>
            </Popover>
            <div className="flex gap-2">
              <Button type="button" variant="ghost" size="sm" className="h-8 btn-press" onClick={resetForm}>Cancelar</Button>
              <Button type="submit" size="sm" className="h-8 btn-press" disabled={!newTaskTitle.trim()}>
                <Plus className="h-3.5 w-3.5 mr-1" /> Añadir tarea
              </Button>
            </div>
          </div>
        </form>
      )}

      {/* Column header */}
      {sortedTasks.length > 0 && (
        <div className="flex items-center px-3 py-1.5 text-[11px] text-muted-foreground uppercase tracking-wider font-medium select-none">
          <div className="shrink-0 w-4 mr-2" /> {/* checkbox spacer */}
          <div className="flex-1 min-w-0">Nombre</div>
          <ColumnResizeHandle onResize={(d) => resize('priority', d)} onReset={resetWidths} />
          <div style={{ width: widths.priority }} className="shrink-0 text-center">Prioridad</div>
          <ColumnResizeHandle onResize={(d) => resize('date', d)} onReset={resetWidths} />
          <div style={{ width: widths.date }} className="shrink-0 text-center">Fecha</div>
          <ColumnResizeHandle onResize={(d) => resize('subtasks', d)} onReset={resetWidths} />
          <div style={{ width: widths.subtasks }} className="shrink-0 text-center">Subtareas</div>
          <div className="w-[56px] shrink-0" /> {/* actions spacer */}
        </div>
      )}

      {/* Active tasks */}
      {sortMode === 'manual' && filterMode === 'all' ? (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={sortedTasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
            <div className="rounded-lg border border-border overflow-hidden divide-y divide-border">
              {sortedTasks.map(task => (
                <SortableTask key={task.id} task={task} hooks={hooks} />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      ) : (
        <div className="rounded-lg border border-border overflow-hidden divide-y divide-border">
          {sortedTasks.map(task => (
            <TaskItem key={task.id} task={task} hooks={hooks} />
          ))}
        </div>
      )}

      {sortedTasks.length === 0 && (
        <div className="text-center py-12 text-muted-foreground text-sm">
          {filterMode !== 'all' ? 'Ninguna tarea coincide con este filtro.' : 'No hay tareas aún. Añade una arriba.'}
        </div>
      )}

      {/* Completed tasks */}
      {completedTasks.length > 0 && (
        <div className="space-y-2">
          <button
            onClick={() => setShowCompleted(!showCompleted)}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
          >
            {showCompleted ? '▾' : '▸'} Completadas ({completedTasks.length})
          </button>
          {showCompleted && (
            <div className="rounded-lg border border-border overflow-hidden divide-y divide-border animate-in-fade">
              {completedTasks.map(task => (
                <TaskItem key={task.id} task={task} hooks={hooks} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
    </ColumnWidthsProvider>
  );
}
