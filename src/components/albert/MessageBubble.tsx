import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Bot, User } from 'lucide-react';
import type { ChatMessage } from '@/types';

interface MessageBubbleProps {
  message: ChatMessage;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex gap-3 px-4 py-3 animate-slideUp ${isUser ? 'justify-end' : ''}`}>
      {!isUser && (
        <div className="flex-shrink-0 h-7 w-7 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
          <Bot className="h-4 w-4 text-orange-500 dark:text-orange-400" />
        </div>
      )}
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
          isUser
            ? 'bg-primary text-primary-foreground'
            : 'bg-muted'
        }`}
      >
        {isUser ? (
          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
        ) : (
          <div className="text-sm prose prose-sm dark:prose-invert max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 [&_p]:my-1.5 [&_pre]:bg-background/50 [&_pre]:rounded-lg [&_pre]:p-3 [&_code]:text-xs [&_ul]:my-1.5 [&_ol]:my-1.5">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {message.content}
            </ReactMarkdown>
          </div>
        )}
        {message.provider && !isUser && (
          <p className="text-[10px] text-muted-foreground mt-1 opacity-60">{message.provider}</p>
        )}
      </div>
      {isUser && (
        <div className="flex-shrink-0 h-7 w-7 rounded-full bg-primary flex items-center justify-center">
          <User className="h-4 w-4 text-primary-foreground" />
        </div>
      )}
    </div>
  );
}

// Streaming bubble for in-progress responses
export function StreamingBubble({ content }: { content: string }) {
  return (
    <div className="flex gap-3 px-4 py-3 animate-slideUp">
      <div className="flex-shrink-0 h-7 w-7 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
        <Bot className="h-4 w-4 text-orange-500 dark:text-orange-400" />
      </div>
      <div className="max-w-[80%] rounded-2xl px-4 py-2.5 bg-muted">
        <div className="text-sm prose prose-sm dark:prose-invert max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 [&_p]:my-1.5 [&_pre]:bg-background/50 [&_pre]:rounded-lg [&_pre]:p-3 [&_code]:text-xs">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {content}
          </ReactMarkdown>
          <span className="inline-block w-2 h-4 bg-foreground/70 animate-pulse ml-0.5" />
        </div>
      </div>
    </div>
  );
}
