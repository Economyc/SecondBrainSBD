import { useState, useRef, useEffect, useMemo } from 'react';
import { Search, X, CheckSquare, FileText, DollarSign } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSidebar } from '@/components/ui/sidebar';
import { SidebarMenuButton } from '@/components/ui/sidebar';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useEnvironment } from '@/contexts/EnvironmentContext';
import { getTasks, getFiles, getTransactions } from '@/lib/storage';

interface SearchResult {
  id: string;
  type: 'task' | 'document' | 'finance';
  title: string;
  subtitle?: string;
  route: string;
}

export function SidebarSearch() {
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const [query, setQuery] = useState('');
  const [showResults, setShowResults] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { environment } = useEnvironment();

  // Ctrl+K focuses the sidebar input
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        inputRef.current?.focus();
      }
      if (e.key === 'Escape') {
        setQuery('');
        setShowResults(false);
        inputRef.current?.blur();
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  // Click outside to close results
  useEffect(() => {
    if (!showResults) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowResults(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showResults]);

  const results = useMemo<SearchResult[]>(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();

    const tasks = getTasks(environment)
      .filter(t => t.title.toLowerCase().includes(q) || t.description.toLowerCase().includes(q))
      .slice(0, 4)
      .map(t => ({ id: t.id, type: 'task' as const, title: t.title, subtitle: t.completed ? 'Completada' : 'Activa', route: '/tasks' }));

    const files = getFiles(environment)
      .filter(f => f.name.toLowerCase().includes(q))
      .slice(0, 4)
      .map(f => ({ id: f.id, type: 'document' as const, title: f.name, subtitle: f.type, route: '/documents' }));

    const txs = getTransactions(environment)
      .filter(t => t.description.toLowerCase().includes(q) || t.category.toLowerCase().includes(q))
      .slice(0, 4)
      .map(t => ({ id: t.id, type: 'finance' as const, title: t.description, subtitle: `$${t.amount} · ${t.category}`, route: '/finances' }));

    return [...tasks, ...files, ...txs];
  }, [query, environment]);

  const iconMap = { task: CheckSquare, document: FileText, finance: DollarSign };

  const handleSelect = (result: SearchResult) => {
    navigate(result.route);
    setQuery('');
    setShowResults(false);
  };

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <SidebarMenuButton
            className="w-full justify-center"
            onClick={() => inputRef.current?.focus()}
          >
            <Search className="h-4 w-4" />
          </SidebarMenuButton>
        </TooltipTrigger>
        <TooltipContent side="right">Buscar (⌘K)</TooltipContent>
      </Tooltip>
    );
  }

  return (
    <div ref={containerRef} className="relative px-2 py-1.5">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" strokeWidth={1.5} />
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => { setQuery(e.target.value); setShowResults(true); }}
          onFocus={() => query && setShowResults(true)}
          placeholder="Buscar..."
          className="w-full h-8 rounded-md border bg-background pl-8 pr-7 text-sm outline-none focus:ring-1 focus:ring-ring placeholder:text-muted-foreground/50 transition-colors"
        />
        {query && (
          <button
            onClick={() => { setQuery(''); setShowResults(false); }}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {showResults && query.trim() && (
        <div className="absolute left-2 right-2 top-full mt-1 rounded-lg border bg-popover shadow-lg overflow-hidden z-50 animate-in fade-in-0 slide-in-from-top-1 duration-150">
          {results.length === 0 ? (
            <div className="px-4 py-4 text-center text-sm text-muted-foreground">No se encontraron resultados</div>
          ) : (
            <div className="py-1 max-h-64 overflow-auto">
              {results.map((result) => {
                const Icon = iconMap[result.type];
                return (
                  <button
                    key={result.id}
                    onClick={() => handleSelect(result)}
                    className="w-full flex items-center gap-3 px-3 py-2 text-sm hover:bg-muted/50 transition-colors text-left"
                  >
                    <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate">{result.title}</p>
                      {result.subtitle && (
                        <p className="text-[11px] text-muted-foreground truncate">{result.subtitle}</p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
