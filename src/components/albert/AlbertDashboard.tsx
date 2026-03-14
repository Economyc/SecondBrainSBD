import { useState, useCallback, useEffect } from 'react';
import { Menu } from 'lucide-react';
import { useAlbert } from '@/hooks/useAlbert';
import { useChat } from '@/hooks/useChat';
import { hasAnyKey } from '@/lib/albert/providers';
import { useIsMobile } from '@/hooks/use-mobile';
import { ConversationSidebar } from './ConversationSidebar';
import { ChatArea } from './ChatArea';
import { SettingsDialog } from './SettingsDialog';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';

export function AlbertDashboard() {
  const {
    conversations,
    activeConversation,
    activeConversationId,
    setActiveConversationId,
    createConversation,
    deleteConversation,
    addMessage,
    updateConversation,
  } = useAlbert();

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const isMobile = useIsMobile();

  // Auto-open settings if no API keys
  useEffect(() => {
    if (!hasAnyKey()) {
      setSettingsOpen(true);
    }
  }, []);

  const { streamingContent, isStreaming, searchResults, sendMessage, stopStreaming } = useChat({
    onMessageComplete: addMessage,
  });

  const handleSend = useCallback(async (content: string) => {
    let convId = activeConversationId;

    if (!convId) {
      const conv = await createConversation();
      convId = conv.id;
    }

    const conv = conversations.find(c => c.id === convId);
    const existingMessages = conv?.messages || [];

    try {
      await sendMessage(convId!, existingMessages, content);
    } catch (err: unknown) {
      // Error handling — could show toast
      console.error('Albert error:', err);
    }

    // Auto-generate title from first user message
    if (existingMessages.length === 0 && convId) {
      const title = content.length > 50 ? content.slice(0, 50) + '...' : content;
      updateConversation(convId, { title });
    }
  }, [activeConversationId, conversations, createConversation, sendMessage, updateConversation]);

  const handleSelectConversation = useCallback((id: string) => {
    setActiveConversationId(id);
    setSheetOpen(false);
  }, [setActiveConversationId]);

  const sidebarContent = (
    <ConversationSidebar
      conversations={conversations}
      activeId={activeConversationId}
      onSelect={handleSelectConversation}
      onCreate={async () => {
        await createConversation();
        setSheetOpen(false);
      }}
      onDelete={deleteConversation}
      onOpenSettings={() => setSettingsOpen(true)}
    />
  );

  return (
    <div className="flex h-[calc(100vh-3.5rem)] overflow-hidden">
      {/* Desktop sidebar */}
      {!isMobile && sidebarContent}

      {/* Mobile sidebar as Sheet */}
      {isMobile && (
        <div className="absolute top-2 left-2 z-10">
          <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Menu className="h-4 w-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-[280px]">
              {sidebarContent}
            </SheetContent>
          </Sheet>
        </div>
      )}

      {/* Chat area */}
      <div className="flex-1 flex flex-col min-w-0">
        <ChatArea
          conversation={activeConversation}
          streamingContent={streamingContent}
          isStreaming={isStreaming}
          searchResults={searchResults}
          onSend={handleSend}
          onStop={stopStreaming}
          disabled={!hasAnyKey()}
        />
      </div>

      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
    </div>
  );
}
