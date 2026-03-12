import { useState } from 'react';
import { Plus, Trash2, ChevronDown, ChevronRight, X, Flag, CalendarIcon, AlignLeft, ListChecks, GripVertical } from 'lucide-react';
import { format, isPast, isToday } from 'date-fns';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Progress } from '@/components/ui/progress';
import type { Task, Subtask, TaskPriority } from '@/types';
import { useTasks } from '@/hooks/useTasks';
import { useColumnWidthsContext } from '@/contexts/ColumnWidthsContext';

const PRIORITY_STYLES: Record<TaskPriority, string> = {
  none: 'text-muted-foreground/30',
  low: 'text-priority-low',
  medium: 'text-priority-medium',
  high: 'text-priority-high',
};

const PRIORITY_BG: Record<TaskPriority, string> = {
  none: '',
  low: 'bg-priority-low/10 text-priority-low',
  medium: 'bg-priority-medium/10 text-priority-medium',
  high: 'bg-priority-high/10 text-priority-high',
};

const PRIORITY_LABELS: Record<TaskPriority, string> = {
  none: 'Sin prioridad',
  low: 'Baja',
  medium: 'Media',
  high: 'Alta',
};

const PRIORITY_BORDER: Record<TaskPriority, string> = {
  none: '',
  low: 'border-l-2 border-l-priority-low/40',
  medium: 'border-l-2 border-l-priority-medium/40',
  high: 'border-l-2 border-l-priority-high/40',
};

interface TaskItemProps {
  task: Task;
  hooks: ReturnType<typeof useTasks>;
}

function SortableSubtask({ sub, taskId, hooks }: { sub: Subtask; taskId: string; hooks: ReturnType<typeof useTasks> }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: sub.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        'flex items-center gap-1 rounded-md hover:bg-muted/50 px-2 py-1.5 group/sub transition-colors',
        isDragging ? 'z-10 relative' : '',
        'cursor-grab active:cursor-grabbing'
      )}
    >
      <GripVertical className="h-3 w-3 text-muted-foreground/50 shrink-0" />
      <div onPointerDown={(e) => e.stopPropagation()}>
        <Checkbox checked={sub.completed} onCheckedChange={() => hooks.toggleSubtask(taskId, sub.id)} className="h-3.5 w-3.5 checkbox-animate" />
      </div>
      <span className={cn('text-sm flex-1 transition-colors', sub.completed && 'line-through text-muted-foreground')}>{sub.title}</span>
      <div onPointerDown={(e) => e.stopPropagation()}>
        <Button variant="ghost" size="icon" className="h-5 w-5 opacity-0 group-hover/sub:opacity-100 transition-opacity" onClick={() => hooks.deleteSubtask(taskId, sub.id)}>
          <X className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}

export function TaskItem({ task, hooks }: TaskItemProps) {
  const { widths } = useColumnWidthsContext();
  const [expanded, setExpanded] = useState(false);
  const [newSubtask, setNewSubtask] = useState('');
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(task.title);

  const subtaskCount = task.subtasks.length;
  const completedSubtasks = task.subtasks.filter(s => s.completed).length;
  const subtaskProgress = subtaskCount > 0 ? (completedSubtasks / subtaskCount) * 100 : 0;

  const dueDateObj = task.dueDate ? new Date(task.dueDate + 'T00:00:00') : null;
  const isOverdue = dueDateObj && isPast(dueDateObj) && !isToday(dueDateObj) && !task.completed;
  const isDueToday = dueDateObj && isToday(dueDateObj) && !task.completed;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleSubtaskDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = task.subtasks.findIndex(s => s.id === active.id);
      const newIndex = task.subtasks.findIndex(s => s.id === over.id);
      const reordered = [...task.subtasks];
      const [moved] = reordered.splice(oldIndex, 1);
      reordered.splice(newIndex, 0, moved);
      hooks.reorderSubtasks(task.id, reordered);
    }
  };

  return (
    <div className={cn(
      'group bg-card transition-all duration-200 hover:bg-muted/40',
      PRIORITY_BORDER[task.priority || 'none'],
      task.completed && 'opacity-60'
    )}>
      {/* Main row - Notion-style columns */}
      <div className="flex items-center px-3 py-2">

        {/* Checkbox */}
        <div className="shrink-0 mr-2" onPointerDown={(e) => e.stopPropagation()}>
          <Checkbox
            checked={task.completed}
            onCheckedChange={() => hooks.toggleTask(task.id)}
            className="checkbox-animate"
          />
        </div>

        {/* Name column - flexible */}
        <div className="flex-1 min-w-0">
          {editing ? (
            <Input
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              onBlur={() => { hooks.updateTask(task.id, { title: editTitle }); setEditing(false); }}
              onKeyDown={(e) => { if (e.key === 'Enter') { hooks.updateTask(task.id, { title: editTitle }); setEditing(false); } }}
              className="h-7 text-sm"
              autoFocus
            />
          ) : (
            <span
              className={cn('text-sm font-medium cursor-pointer select-none transition-all duration-200 truncate block', task.completed && 'line-through text-muted-foreground')}
              onDoubleClick={() => { setEditing(true); setEditTitle(task.title); }}
            >
              {task.title}
            </span>
          )}
        </div>

        <div className="w-3 shrink-0" />
        {/* Priority column */}
        <div style={{ width: widths.priority }} className="shrink-0" onPointerDown={(e) => e.stopPropagation()}>
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                className={cn(
                  'inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium transition-all w-full justify-center',
                  (!task.priority || task.priority === 'none')
                    ? 'text-muted-foreground/40 hover:bg-muted'
                    : PRIORITY_BG[task.priority]
                )}
              >
                <Flag className="h-3 w-3" fill={(!task.priority || task.priority === 'none') ? 'none' : 'currentColor'} />
                {PRIORITY_LABELS[task.priority || 'none']}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-36 p-1" align="start">
              {(['none', 'low', 'medium', 'high'] as TaskPriority[]).map(p => (
                <button
                  key={p}
                  type="button"
                  className={cn('w-full flex items-center gap-2 px-2 py-1.5 text-xs rounded-sm hover:bg-muted transition-colors', (task.priority || 'none') === p && 'bg-muted')}
                  onClick={() => hooks.updateTask(task.id, { priority: p })}
                >
                  <Flag className={cn('h-3 w-3', PRIORITY_STYLES[p])} fill={p === 'none' ? 'none' : 'currentColor'} />
                  {PRIORITY_LABELS[p]}
                </button>
              ))}
            </PopoverContent>
          </Popover>
        </div>

        <div className="w-3 shrink-0" />
        {/* Date column */}
        <div style={{ width: widths.date }} className="shrink-0 text-center" onPointerDown={(e) => e.stopPropagation()}>
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                className={cn(
                  'inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] transition-all w-full justify-center',
                  isOverdue && 'bg-priority-high/10 text-priority-high font-medium',
                  isDueToday && 'bg-priority-medium/10 text-priority-medium font-medium',
                  !isOverdue && !isDueToday && dueDateObj && 'text-muted-foreground hover:bg-muted',
                  !dueDateObj && 'text-muted-foreground/30 hover:bg-muted hover:text-muted-foreground'
                )}
              >
                <CalendarIcon className="h-3 w-3" />
                {dueDateObj ? (
                  <span>{isOverdue ? 'Vencida' : isDueToday ? 'Hoy' : format(dueDateObj, 'MMM d')}</span>
                ) : (
                  <span>Sin fecha</span>
                )}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={dueDateObj || undefined}
                onSelect={(d) => hooks.updateTask(task.id, { dueDate: d ? d.toISOString().substring(0, 10) : undefined })}
                initialFocus
                className="p-3 pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
        </div>

        <div className="w-3 shrink-0" />
        {/* Subtask count column */}
        <div style={{ width: widths.subtasks }} className="shrink-0 text-center">
          {subtaskCount > 0 ? (
            <div className="flex items-center gap-1 justify-center">
              <span className="text-[11px] text-muted-foreground font-medium">{completedSubtasks}/{subtaskCount}</span>
              <div className="w-4 h-1 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-foreground/40 rounded-full transition-all" style={{ width: `${subtaskProgress}%` }} />
              </div>
            </div>
          ) : (
            <span className="text-[11px] text-muted-foreground/30">—</span>
          )}
        </div>

        {/* Actions: expand + delete */}
        <div className="flex items-center gap-0.5 shrink-0" onPointerDown={(e) => e.stopPropagation()}>
          <Button variant="ghost" size="icon" className="h-6 w-6 btn-press" onClick={() => setExpanded(!expanded)}>
            {expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
          </Button>
          <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-foreground btn-press opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => hooks.deleteTask(task.id)}>
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div className="mx-3 mb-3 mt-1 rounded-lg bg-muted/20 border border-border/50 p-4 animate-in slide-in-from-top-1 duration-150" onPointerDown={(e) => e.stopPropagation()}>
          <div className={cn('grid gap-6', dueDateObj ? 'grid-cols-1 md:grid-cols-[1fr_280px]' : 'grid-cols-1')}>

            {/* Left column: Description + Subtasks */}
            <div className="space-y-5">

              {/* Description */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  <AlignLeft className="h-3.5 w-3.5" />
                  <span>Descripción</span>
                </div>
                <Textarea
                  placeholder="Añadir una descripción..."
                  value={task.description}
                  onChange={(e) => hooks.updateTask(task.id, { description: e.target.value })}
                  className="text-sm min-h-[60px] resize-none bg-background/50 border-border/50"
                />
              </div>

              {/* Subtasks */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    <ListChecks className="h-3.5 w-3.5" />
                    <span>Subtareas</span>
                  </div>
                  {subtaskCount > 0 && (
                    <span className="text-[11px] font-medium text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded">
                      {completedSubtasks}/{subtaskCount}
                    </span>
                  )}
                </div>
                {subtaskCount > 0 && <Progress value={subtaskProgress} className="h-1.5" />}
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleSubtaskDragEnd}>
                  <SortableContext items={task.subtasks.map(s => s.id)} strategy={verticalListSortingStrategy}>
                    <div className="space-y-0.5">
                      {task.subtasks.map((sub) => (
                        <SortableSubtask key={sub.id} sub={sub} taskId={task.id} hooks={hooks} />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
                <form
                  className="flex gap-2 max-w-sm"
                  onSubmit={(e) => { e.preventDefault(); if (newSubtask.trim()) { hooks.addSubtask(task.id, newSubtask.trim()); setNewSubtask(''); } }}
                >
                  <Input
                    value={newSubtask}
                    onChange={(e) => setNewSubtask(e.target.value)}
                    placeholder="Añadir subtarea..."
                    className="h-7 text-sm border-dashed"
                  />
                  <Button type="submit" variant="ghost" size="icon" className="h-7 w-7 shrink-0 btn-press">
                    <Plus className="h-3 w-3" />
                  </Button>
                </form>
              </div>
            </div>

            {/* Right column: Date chip (only if due date exists) */}
            {dueDateObj && (
              <div className="space-y-5">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    <CalendarIcon className="h-3.5 w-3.5" />
                    <span>Fecha</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className={cn(
                      'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium',
                      isOverdue && 'bg-priority-high/10 text-priority-high',
                      isDueToday && 'bg-priority-medium/10 text-priority-medium',
                      !isOverdue && !isDueToday && 'bg-muted/60 text-muted-foreground'
                    )}>
                      <CalendarIcon className="h-3 w-3" />
                      {format(dueDateObj, 'PPP')}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-muted-foreground hover:text-foreground"
                      onClick={() => hooks.updateTask(task.id, { dueDate: undefined })}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
