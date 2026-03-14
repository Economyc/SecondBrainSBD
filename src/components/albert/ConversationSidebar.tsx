import { Plus, Trash2, MessageSquare, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { Conversation } from '@/types';

interface ConversationSidebarProps {
  conversations: Conversation[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onCreate: () => void;
  onDelete: (id: string) => void;
  onOpenSettings: () => void;
}

export function ConversationSidebar({
  conversations,
  activeId,
  onSelect,
  onCreate,
  onDelete,
  onOpenSettings,
}: ConversationSidebarProps) {
  return (
    <div className="w-[280px] border-r flex flex-col bg-muted/30">
      <div className="p-3 flex items-center gap-2">
        <Button onClick={onCreate} className="flex-1 gap-2" size="sm">
          <Plus className="h-4 w-4" />
          Nueva conversación
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={onOpenSettings}>
          <Settings className="h-4 w-4" />
        </Button>
      </div>
      <ScrollArea className="flex-1">
        <div className="px-2 pb-2 space-y-0.5">
          {conversations.map((conv) => (
            <button
              key={conv.id}
              onClick={() => onSelect(conv.id)}
              className={`w-full flex items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors group ${
                activeId === conv.id
                  ? 'bg-accent text-accent-foreground'
                  : 'hover:bg-muted'
              }`}
            >
              <MessageSquare className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="flex-1 truncate">{conv.title}</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(conv.id);
                }}
              >
                <Trash2 className="h-3 w-3 text-muted-foreground" />
              </Button>
            </button>
          ))}
          {conversations.length === 0 && (
            <p className="px-3 py-8 text-xs text-muted-foreground text-center">
              No hay conversaciones aún
            </p>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
