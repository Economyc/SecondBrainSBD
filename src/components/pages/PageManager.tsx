import { useState, useEffect } from 'react';
import { Plus, Trash2, ArrowLeft, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { usePages } from '@/hooks/usePages';
import { PageEditor } from './PageEditor';
import type { NotePage } from '@/types';

export function PageManager() {
  const { pages, addPage, updatePage, deletePage } = usePages();
  const [activePage, setActivePage] = useState<NotePage | null>(null);
  const [newTitle, setNewTitle] = useState('');

  const handleCreate = () => {
    const page = addPage(newTitle || 'Untitled');
    setNewTitle('');
    setActivePage(page);
  };

  const handleDelete = (id: string) => {
    deletePage(id);
    if (activePage?.id === id) setActivePage(null);
  };

  // Escape to go back from editor
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && activePage) {
        const active = document.activeElement;
        // Don't close if user is typing in the editor or an input
        if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.getAttribute('contenteditable'))) {
          (active as HTMLElement).blur();
          return;
        }
        setActivePage(null);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [activePage]);
  if (activePage) {
    const current = pages.find(p => p.id === activePage.id) || activePage;
    return (
      <div className="p-6 space-y-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setActivePage(null)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <Input
            value={current.title}
            onChange={(e) => updatePage(current.id, { title: e.target.value })}
            className="text-xl font-semibold border-none shadow-none px-0 h-auto focus-visible:ring-0 focus-visible:ring-offset-0"
            placeholder="Page title"
          />
        </div>
        <PageEditor page={current} onUpdate={updatePage} />
      </div>
    );
  }

  // List view
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Pages</h1>
          <p className="text-sm text-muted-foreground">{pages.length} pages</p>
        </div>
        <div className="flex items-center gap-2">
          <Input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Page title…"
            className="h-8 w-40 text-sm"
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
          />
          <Button size="sm" className="gap-1.5" onClick={handleCreate}>
            <Plus className="h-4 w-4" />
            New
          </Button>
        </div>
      </div>

      <div className="space-y-1">
        {pages.map(page => (
          <div
            key={page.id}
            className="group flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-accent/50 transition-colors cursor-pointer"
            onClick={() => setActivePage(page)}
          >
            <div className="h-8 w-8 rounded-full flex items-center justify-center bg-muted">
              <FileText className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{page.title}</p>
              <p className="text-xs text-muted-foreground">
                Updated {new Date(page.updatedAt).toLocaleDateString()}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(e) => { e.stopPropagation(); handleDelete(page.id); }}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        ))}
      </div>

      {pages.length === 0 && (
        <div className="text-center py-16 text-muted-foreground text-sm">
          No pages yet. Create your first one.
        </div>
      )}
    </div>
  );
}
