import { useState, useCallback, useRef } from 'react';
import { v4 as uuid } from 'uuid';
import { streamGroq, streamGemini, getApiKeys } from '@/lib/albert/providers';
import { executeWebSearch, formatSearchResults } from '@/lib/albert/tools';
import type { ChatMessage, AIProvider, ToolCallRecord } from '@/types';

const SYSTEM_PROMPT = `You are Albert, an intelligent AI assistant integrated into SecondBrain — a personal productivity app. You help with everyday tasks, answer questions, and can search the web when needed. Be concise, helpful, and friendly. Respond in the same language the user writes in.`;

interface UseChatOptions {
  onMessageComplete: (convId: string, message: ChatMessage) => Promise<void>;
}

export function useChat({ onMessageComplete }: UseChatOptions) {
  const [streamingContent, setStreamingContent] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [searchResults, setSearchResults] = useState<{ title: string; url: string; snippet: string }[]>([]);
  const abortRef = useRef<AbortController | null>(null);

  const stopStreaming = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setIsStreaming(false);
  }, []);

  const sendMessage = useCallback(async (
    convId: string,
    existingMessages: ChatMessage[],
    userContent: string,
  ) => {
    const keys = getApiKeys();
    const hasGroq = !!keys.groq;
    const hasGemini = !!keys.gemini;
    if (!hasGroq && !hasGemini) {
      throw new Error('No API keys configured. Open Settings to add your API keys.');
    }

    // Build user message
    const userMessage: ChatMessage = {
      id: uuid(),
      role: 'user',
      content: userContent,
      createdAt: new Date().toISOString(),
    };
    await onMessageComplete(convId, userMessage);

    // Build full message list with system prompt
    const systemMsg: ChatMessage = {
      id: 'system',
      role: 'system',
      content: SYSTEM_PROMPT,
      createdAt: '',
    };
    const allMessages = [systemMsg, ...existingMessages, userMessage];

    setIsStreaming(true);
    setStreamingContent('');
    setSearchResults([]);

    const controller = new AbortController();
    abortRef.current = controller;

    let provider: AIProvider = hasGroq ? 'groq' : 'gemini';
    let result: { content: string; toolCalls?: { id: string; name: string; arguments: string }[] };

    const streamFn = provider === 'groq' ? streamGroq : streamGemini;

    try {
      result = await streamFn(
        allMessages,
        { onChunk: (chunk) => setStreamingContent(prev => prev + chunk) },
        controller.signal,
      );
    } catch (err: unknown) {
      // Try fallback if primary fails
      if (controller.signal.aborted) {
        setIsStreaming(false);
        return;
      }

      const fallbackProvider: AIProvider = provider === 'groq' ? 'gemini' : 'groq';
      const fallbackKey = fallbackProvider === 'groq' ? keys.groq : keys.gemini;
      if (!fallbackKey) {
        setIsStreaming(false);
        throw err;
      }

      provider = fallbackProvider;
      setStreamingContent('');
      const fallbackFn = provider === 'groq' ? streamGroq : streamGemini;
      try {
        result = await fallbackFn(
          allMessages,
          { onChunk: (chunk) => setStreamingContent(prev => prev + chunk) },
          controller.signal,
        );
      } catch (fallbackErr) {
        setIsStreaming(false);
        throw fallbackErr;
      }
    }

    // Handle tool calls (web search)
    if (result.toolCalls?.length) {
      const toolResults: ToolCallRecord[] = [];

      for (const tc of result.toolCalls) {
        if (tc.name === 'web_search') {
          let query: string;
          try {
            query = JSON.parse(tc.arguments).query;
          } catch {
            query = tc.arguments;
          }

          const results = await executeWebSearch(query);
          setSearchResults(results);
          const formatted = formatSearchResults(results);
          toolResults.push({ id: tc.id, name: tc.name, arguments: tc.arguments, result: formatted });
        }
      }

      // Save assistant message with tool calls
      if (result.content) {
        const assistantWithTools: ChatMessage = {
          id: uuid(),
          role: 'assistant',
          content: result.content,
          provider,
          toolCalls: toolResults,
          createdAt: new Date().toISOString(),
        };
        await onMessageComplete(convId, assistantWithTools);
      }

      // Build tool result messages and re-send for summary
      const toolResultMessages: ChatMessage[] = toolResults.map(tr => ({
        id: uuid(),
        role: 'user' as const,
        content: `[Search results for "${JSON.parse(tr.arguments || '{}').query || ''}"]\n\n${tr.result}`,
        createdAt: new Date().toISOString(),
      }));

      const messagesWithToolResults = [
        ...allMessages,
        ...(result.content
          ? [{ id: uuid(), role: 'assistant' as const, content: result.content, createdAt: new Date().toISOString() }]
          : []),
        ...toolResultMessages,
      ];

      setStreamingContent('');

      try {
        const summaryResult = await streamFn(
          messagesWithToolResults,
          { onChunk: (chunk) => setStreamingContent(prev => prev + chunk) },
          controller.signal,
        );

        const summaryMessage: ChatMessage = {
          id: uuid(),
          role: 'assistant',
          content: summaryResult.content,
          provider,
          createdAt: new Date().toISOString(),
        };
        await onMessageComplete(convId, summaryMessage);
      } catch {
        // If summary fails, at least the tool results are saved
      }
    } else {
      // No tool calls — save regular assistant message
      const assistantMessage: ChatMessage = {
        id: uuid(),
        role: 'assistant',
        content: result.content,
        provider,
        createdAt: new Date().toISOString(),
      };
      await onMessageComplete(convId, assistantMessage);
    }

    setIsStreaming(false);
    setStreamingContent('');
  }, [onMessageComplete]);

  return { streamingContent, isStreaming, searchResults, sendMessage, stopStreaming };
}
