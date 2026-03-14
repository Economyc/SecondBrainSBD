import { useEffect, useRef } from 'react';
import { Bot } from 'lucide-react';
import { MessageBubble, StreamingBubble } from './MessageBubble';
import { ChatInput } from './ChatInput';
import { TypingIndicator } from './TypingIndicator';
import { SearchResultCard } from './SearchResultCard';
import type { Conversation } from '@/types';

interface ChatAreaProps {
  conversation: Conversation | null;
  streamingContent: string;
  isStreaming: boolean;
  searchResults: { title: string; url: string; snippet: string }[];
  onSend: (content: string) => void;
  onStop: () => void;
  disabled?: boolean;
}

export function ChatArea({
  conversation,
  streamingContent,
  isStreaming,
  searchResults,
  onSend,
  onStop,
  disabled,
}: ChatAreaProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll on new content
  useEffect(() => {
    const el = scrollRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [conversation?.messages.length, streamingContent]);

  if (!conversation) {
    return (
      <div className="flex-1 flex flex-col min-h-0">
        <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-4">
          <div className="h-16 w-16 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
            <Bot className="h-8 w-8 text-orange-500 dark:text-orange-400" />
          </div>
          <div className="text-center">
            <h3 className="font-semibold text-foreground text-lg">Albert</h3>
            <p className="text-sm mt-1">Tu asistente IA personal</p>
            <p className="text-xs mt-2">Escribe un mensaje para comenzar</p>
          </div>
        </div>
        <ChatInput
          onSend={onSend}
          onStop={onStop}
          isStreaming={isStreaming}
          disabled={disabled}
        />
      </div>
    );
  }

  const messages = conversation.messages.filter(m => m.role !== 'system');

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        {messages.length === 0 && !isStreaming && (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-3">
            <Bot className="h-10 w-10 text-orange-400/60 dark:text-orange-500/40" />
            <p className="text-sm">¿En qué puedo ayudarte?</p>
          </div>
        )}
        <div className="max-w-3xl mx-auto py-4">
          {messages.map((msg) => (
            <MessageBubble key={msg.id} message={msg} />
          ))}
          {searchResults.length > 0 && (
            <SearchResultCard results={searchResults} />
          )}
          {isStreaming && streamingContent && (
            <StreamingBubble content={streamingContent} />
          )}
          {isStreaming && !streamingContent && (
            <TypingIndicator />
          )}
        </div>
      </div>
      <ChatInput
        onSend={onSend}
        onStop={onStop}
        isStreaming={isStreaming}
        disabled={disabled}
      />
    </div>
  );
}
