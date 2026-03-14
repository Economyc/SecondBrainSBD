import { useState, useEffect, useCallback, useRef } from 'react';
import { Home, CheckSquare, FileText, DollarSign, Users, User, Briefcase, ChevronsUpDown, Lock, Unlock, Settings2, Eye, EyeOff, Search, Bot } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { NavLink } from '@/components/NavLink';
import { useEnvironment } from '@/contexts/EnvironmentContext';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
  useSidebar,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import type { LucideIcon } from 'lucide-react';
import { SidebarSearch } from '@/components/search/SidebarSearch';

interface ModuleItem {
  id: string;
  title: string;
  url: string;
  icon: LucideIcon;
}

const DEFAULT_MODULES: ModuleItem[] = [
  { id: 'home', title: 'Inicio', url: '/home', icon: Home },
  { id: 'tasks', title: 'Tareas', url: '/tasks', icon: CheckSquare },
  { id: 'documents', title: 'Documentos', url: '/documents', icon: FileText },
  { id: 'finances', title: 'Finanzas', url: '/finances', icon: DollarSign },
  { id: 'contacts', title: 'Contactos', url: '/contacts', icon: Users },
  { id: 'albert', title: 'Albert', url: '/albert', icon: Bot },
];

const STORAGE_KEY = 'secondbrain:module-order';
const LOCK_KEY = 'secondbrain:module-lock';
const HIDDEN_KEY = 'secondbrain:module-hidden';

function getStoredHidden(): string[] {
  try {
    const stored = localStorage.getItem(HIDDEN_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function getStoredOrder(): string[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : DEFAULT_MODULES.map(m => m.id);
  } catch {
    return DEFAULT_MODULES.map(m => m.id);
  }
}

function getOrderedModules(order: string[]): ModuleItem[] {
  const map = new Map(DEFAULT_MODULES.map(m => [m.id, m]));
  const ordered = order.filter(id => map.has(id)).map(id => map.get(id)!);
  // Add any new modules not in stored order
  DEFAULT_MODULES.forEach(m => {
    if (!order.includes(m.id)) ordered.push(m);
  });
  return ordered;
}

const environments = [
  { value: 'personal' as const, label: 'Personal', icon: User },
  { value: 'work' as const, label: 'Trabajo', icon: Briefcase },
];

function SortableModule({ item, collapsed, isActive, wasDragging }: { item: ModuleItem; collapsed: boolean; isActive: boolean; wasDragging: React.MutableRefObject<boolean> }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition: transition ?? undefined,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : undefined,
  };

  // Track that a drag occurred so we can block the subsequent click/navigation
  useEffect(() => {
    if (isDragging) {
      wasDragging.current = true;
    }
  }, [isDragging, wasDragging]);

  const handleClick = useCallback((e: React.MouseEvent) => {
    if (wasDragging.current) {
      e.preventDefault();
      e.stopPropagation();
      // Reset after a tick so future normal clicks work
      requestAnimationFrame(() => { wasDragging.current = false; });
    }
  }, [wasDragging]);

  return (
    <SidebarMenuItem ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <SidebarMenuButton
        asChild
        isActive={isActive}
        tooltip={item.title}
      >
        <NavLink to={item.url} end activeClassName="bg-accent text-accent-foreground font-medium" onClick={handleClick}>
          <item.icon className="h-4 w-4" />
          {!collapsed && <span>{item.title}</span>}
        </NavLink>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

export function AppSidebar() {
  const { environment, setEnvironment } = useEnvironment();
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const location = useLocation();
  const wasDraggingRef = useRef(false);

  const [moduleOrder, setModuleOrder] = useState<string[]>(getStoredOrder);
  const [locked, setLocked] = useState(() => {
    try { return localStorage.getItem(LOCK_KEY) === 'true'; } catch { return false; }
  });
  const [hiddenModules, setHiddenModules] = useState<string[]>(getStoredHidden);

  const orderedModules = getOrderedModules(moduleOrder);
  const visibleModules = orderedModules.filter(m => !hiddenModules.includes(m.id));

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    // Work with the visible module order to get correct indices
    const visibleIds = visibleModules.map(m => m.id);
    const oldIndex = visibleIds.indexOf(active.id as string);
    const newIndex = visibleIds.indexOf(over.id as string);
    if (oldIndex === -1 || newIndex === -1) return;

    // Reorder visible items
    const newVisible = [...visibleIds];
    const [moved] = newVisible.splice(oldIndex, 1);
    newVisible.splice(newIndex, 0, moved);

    // Rebuild full order: keep hidden items in their relative positions,
    // but replace visible items with the new order
    const hiddenSet = new Set(hiddenModules);
    const fullOrder: string[] = [];
    let visibleIdx = 0;
    for (const id of moduleOrder) {
      if (hiddenSet.has(id)) {
        fullOrder.push(id);
      } else {
        fullOrder.push(newVisible[visibleIdx++]);
      }
    }
    // Append any remaining
    while (visibleIdx < newVisible.length) {
      fullOrder.push(newVisible[visibleIdx++]);
    }

    setModuleOrder(fullOrder);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(fullOrder));
  }, [moduleOrder, visibleModules, hiddenModules]);

  const toggleLock = () => {
    const next = !locked;
    setLocked(next);
    localStorage.setItem(LOCK_KEY, String(next));
  };

  const toggleModuleVisibility = (id: string) => {
    const next = hiddenModules.includes(id)
      ? hiddenModules.filter(h => h !== id)
      : [...hiddenModules, id];
    setHiddenModules(next);
    localStorage.setItem(HIDDEN_KEY, JSON.stringify(next));
  };

  const current = environments.find(e => e.value === environment) || environments[0];
  const CurrentIcon = current.icon;

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="py-3">
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  className="h-10 gap-2 data-[state=open]:bg-muted"
                  tooltip={current.label}
                >
                  <CurrentIcon className="h-4 w-4 shrink-0" />
                  {!collapsed && (
                    <>
                      <div className="flex-1 text-left">
                        <p className="text-sm font-medium leading-none">{current.label}</p>
                        <p className="text-[11px] text-muted-foreground leading-none mt-0.5">Entorno</p>
                      </div>
                      <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    </>
                  )}
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-48">
                {environments.map((env) => (
                  <DropdownMenuItem
                    key={env.value}
                    onClick={() => setEnvironment(env.value)}
                    className="gap-2"
                  >
                    <env.icon className="h-4 w-4" />
                    <span>{env.label}</span>
                    {environment === env.value && (
                      <span className="ml-auto h-1.5 w-1.5 rounded-full bg-foreground" />
                    )}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarSeparator />

      {/* Search */}
      <SidebarSearch />

      <SidebarContent>
        <SidebarGroup>
          <div className="flex items-center justify-between px-2">
            <SidebarGroupLabel className="px-0">Módulos</SidebarGroupLabel>
            {!collapsed && (
              <div className="flex items-center gap-0.5">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5 text-muted-foreground hover:text-foreground"
                    >
                      <Settings2 className="h-3 w-3" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-44 p-1" align="start" side="right">
                    <p className="px-2 py-1.5 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Visibilidad</p>
                    {orderedModules.map(m => {
                      const hidden = hiddenModules.includes(m.id);
                      return (
                        <button
                          key={m.id}
                          className="w-full flex items-center gap-2 px-2 py-1.5 text-xs rounded-sm hover:bg-muted transition-colors"
                          onClick={() => toggleModuleVisibility(m.id)}
                        >
                          {hidden ? <EyeOff className="h-3 w-3 text-muted-foreground" /> : <Eye className="h-3 w-3" />}
                          <m.icon className="h-3 w-3 text-muted-foreground" />
                          <span className={hidden ? 'text-muted-foreground' : ''}>{m.title}</span>
                        </button>
                      );
                    })}
                  </PopoverContent>
                </Popover>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5 text-muted-foreground hover:text-foreground"
                      onClick={toggleLock}
                    >
                      {locked ? <Lock className="h-3 w-3" /> : <Unlock className="h-3 w-3" />}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="text-xs">
                    {locked ? 'Desbloquear para reordenar' : 'Bloquear orden'}
                  </TooltipContent>
                </Tooltip>
              </div>
            )}
          </div>
          <SidebarGroupContent>
            {locked ? (
              <SidebarMenu>
                {visibleModules.map((item) => (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton
                      asChild
                      isActive={location.pathname === item.url}
                      tooltip={item.title}
                    >
                      <NavLink to={item.url} end activeClassName="bg-accent text-accent-foreground font-medium">
                        <item.icon className="h-4 w-4" />
                        {!collapsed && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            ) : (
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={visibleModules.map(m => m.id)} strategy={verticalListSortingStrategy}>
                  <SidebarMenu>
                    {visibleModules.map((item) => (
                      <SortableModule
                        key={item.id}
                        item={item}
                        collapsed={collapsed}
                        isActive={location.pathname === item.url}
                        wasDragging={wasDraggingRef}
                      />
                    ))}
                  </SidebarMenu>
                </SortableContext>
              </DndContext>
            )}
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <div className="flex items-center justify-center py-2">
          <ThemeToggle />
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
