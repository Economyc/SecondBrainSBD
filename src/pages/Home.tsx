import { useNavigate } from 'react-router-dom';
import { CheckSquare, FileText, DollarSign, ArrowRight, TrendingUp, TrendingDown, Flag, Circle, Users } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useTasks } from '@/hooks/useTasks';
import { useDocuments } from '@/hooks/useDocuments';
import { usePages } from '@/hooks/usePages';
import { useFinances } from '@/hooks/useFinances';
import { useContacts } from '@/hooks/useContacts';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';

export default function Home() {
  const navigate = useNavigate();

  const { tasks, activeTasks, completedTasks, loading: loadingTasks } = useTasks();
  const { files, folders, loading: loadingDocs } = useDocuments();
  const { pages, loading: loadingPages } = usePages();
  const { summary, transactions, loading: loadingFinances } = useFinances();
  const { contacts, favorites, loading: loadingContacts } = useContacts();

  const loading = loadingTasks || loadingDocs || loadingPages || loadingFinances || loadingContacts;

  const highPriority = activeTasks.filter(t => t.priority === 'high').length;
  const recentTasks = activeTasks.slice(0, 3);

  return (
    <AppLayout>
      <div className="p-6 space-y-8">
        {/* Header */}
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Inicio</h1>
          <p className="text-sm text-muted-foreground">Resumen de tu espacio de trabajo</p>
        </div>

        {/* Module Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 stagger-children">
          {/* Tasks Card */}
          <button
            onClick={() => navigate('/tasks')}
            className="group text-left border rounded-lg p-5 space-y-3 bg-card hover:shadow-md transition-all duration-200 hover:border-foreground/20"
          >
            <div className="flex items-center justify-between">
              <CheckSquare className="h-5 w-5 text-muted-foreground" />
              <ArrowRight className="h-4 w-4 text-muted-foreground/0 group-hover:text-muted-foreground transition-all duration-200 -translate-x-1 group-hover:translate-x-0" />
            </div>
            <div>
              <p className="text-2xl font-semibold">{activeTasks.length}</p>
              <p className="text-xs text-muted-foreground">tareas activas</p>
            </div>
            <div className="flex gap-3 text-xs text-muted-foreground">
              <span>{completedTasks.length} completadas</span>
              {highPriority > 0 && (
                <span className="text-priority-high">{highPriority} urgentes</span>
              )}
            </div>
          </button>

          {/* Documents Card */}
          <button
            onClick={() => navigate('/documents')}
            className="group text-left border rounded-lg p-5 space-y-3 bg-card hover:shadow-md transition-all duration-200 hover:border-foreground/20"
          >
            <div className="flex items-center justify-between">
              <FileText className="h-5 w-5 text-muted-foreground" />
              <ArrowRight className="h-4 w-4 text-muted-foreground/0 group-hover:text-muted-foreground transition-all duration-200 -translate-x-1 group-hover:translate-x-0" />
            </div>
            <div>
              <p className="text-2xl font-semibold">{files.length + pages.length}</p>
              <p className="text-xs text-muted-foreground">elementos</p>
            </div>
            <div className="text-xs text-muted-foreground">
              {folders.length} carpetas · {pages.length} páginas
            </div>
          </button>

          {/* Finances Card */}
          <button
            onClick={() => navigate('/finances')}
            className="group text-left border rounded-lg p-5 space-y-3 bg-card hover:shadow-md transition-all duration-200 hover:border-foreground/20"
          >
            <div className="flex items-center justify-between">
              <DollarSign className="h-5 w-5 text-muted-foreground" />
              <ArrowRight className="h-4 w-4 text-muted-foreground/0 group-hover:text-muted-foreground transition-all duration-200 -translate-x-1 group-hover:translate-x-0" />
            </div>
            <div>
              <p className="text-2xl font-semibold">
                {summary.balance.toLocaleString('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 })}
              </p>
              <p className="text-xs text-muted-foreground">saldo</p>
            </div>
            <div className="flex gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-0.5">
                <TrendingUp className="h-3 w-3" />{summary.income.toLocaleString('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 })}
              </span>
              <span className="flex items-center gap-0.5">
                <TrendingDown className="h-3 w-3" />{summary.expenses.toLocaleString('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 })}
              </span>
            </div>
          </button>

          {/* Contacts Card */}
          <button
            onClick={() => navigate('/contacts')}
            className="group text-left border rounded-lg p-5 space-y-3 bg-card hover:shadow-md transition-all duration-200 hover:border-foreground/20"
          >
            <div className="flex items-center justify-between">
              <Users className="h-5 w-5 text-muted-foreground" />
              <ArrowRight className="h-4 w-4 text-muted-foreground/0 group-hover:text-muted-foreground transition-all duration-200 -translate-x-1 group-hover:translate-x-0" />
            </div>
            <div>
              <p className="text-2xl font-semibold">{contacts.length}</p>
              <p className="text-xs text-muted-foreground">contactos</p>
            </div>
            <div className="text-xs text-muted-foreground">
              {favorites.length} favoritos
            </div>
          </button>
        </div>

        {/* Recent Tasks */}
        {recentTasks.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Tareas recientes</h2>
              <button
                onClick={() => navigate('/tasks')}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Ver todas →
              </button>
            </div>
            <div className="space-y-2">
              {recentTasks.map(task => {
                const subtaskCount = task.subtasks?.length || 0;
                const completedSubs = task.subtasks?.filter(s => s.completed).length || 0;
                const progress = subtaskCount > 0 ? (completedSubs / subtaskCount) * 100 : 0;
                const priorityColor: Record<string, string> = {
                  high: 'text-priority-high',
                  medium: 'text-priority-medium',
                  low: 'text-priority-low',
                  none: 'text-muted-foreground/30',
                };
                const borderColor: Record<string, string> = {
                  high: 'border-l-2 border-l-priority-high/40',
                  medium: 'border-l-2 border-l-priority-medium/40',
                  low: 'border-l-2 border-l-priority-low/40',
                  none: '',
                };

                return (
                  <button
                    key={task.id}
                    onClick={() => navigate('/tasks')}
                    className={cn(
                      'w-full text-left border rounded-lg p-3 hover:shadow-sm transition-all duration-200 bg-card hover:bg-accent/30 group',
                      borderColor[task.priority || 'none']
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className="shrink-0">
                        <Circle className={cn('h-4 w-4', task.completed ? 'text-muted-foreground' : 'text-muted-foreground/40')} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={cn('text-sm font-medium truncate', task.completed && 'line-through text-muted-foreground')}>
                            {task.title}
                          </span>
                          {task.priority && task.priority !== 'none' && (
                            <Flag
                              className={cn('h-3 w-3 shrink-0', priorityColor[task.priority])}
                              fill="currentColor"
                            />
                          )}
                        </div>
                        {task.dueDate && (
                          <span className="text-[11px] text-muted-foreground">
                            Vence el {new Date(task.dueDate + 'T00:00:00').toLocaleDateString('es-CO', { month: 'short', day: 'numeric' })}
                          </span>
                        )}
                      </div>
                      {subtaskCount > 0 && (
                        <span className="text-[11px] text-muted-foreground shrink-0">
                          {completedSubs}/{subtaskCount}
                        </span>
                      )}
                    </div>
                    {subtaskCount > 0 && (
                      <div className="mt-2 ml-7">
                        <Progress value={progress} className="h-1" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Quick empty state */}
        {tasks.length === 0 && files.length === 0 && transactions.length === 0 && contacts.length === 0 && !loading && (
          <div className="text-center py-16 space-y-3">
            <p className="text-muted-foreground text-sm">Tu espacio de trabajo está vacío.</p>
            <p className="text-muted-foreground/60 text-xs">Empieza creando una tarea, subiendo un documento o registrando una transacción.</p>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
