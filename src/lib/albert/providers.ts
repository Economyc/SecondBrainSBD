import type { ChatMessage } from '@/types';

// ── Storage keys ──
const GROQ_KEY = 'albert:groq_api_key';
const GEMINI_KEY = 'albert:gemini_api_key';

export function getApiKeys() {
  return {
    groq: localStorage.getItem(GROQ_KEY) || '',
    gemini: localStorage.getItem(GEMINI_KEY) || '',
    tavily: localStorage.getItem('albert:tavily_api_key') || '',
  };
}

export function hasAnyKey(): boolean {
  const keys = getApiKeys();
  return !!(keys.groq || keys.gemini);
}

// ── Tool definitions ──
const GROQ_TOOLS = [
  {
    type: 'function' as const,
    function: {
      name: 'web_search',
      description: 'Search the web for current information. Use when the user asks about recent events, facts you are unsure about, or explicitly asks to search.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'The search query' },
        },
        required: ['query'],
      },
    },
  },
];

const GEMINI_TOOLS = [
  {
    functionDeclarations: [
      {
        name: 'web_search',
        description: 'Search the web for current information. Use when the user asks about recent events, facts you are unsure about, or explicitly asks to search.',
        parameters: {
          type: 'OBJECT',
          properties: {
            query: { type: 'STRING', description: 'The search query' },
          },
          required: ['query'],
        },
      },
    ],
  },
];

// ── Groq streaming ──
interface StreamCallbacks {
  onChunk: (text: string) => void;
  onToolCall?: (name: string, args: string) => void;
}

function buildGroqMessages(messages: ChatMessage[]) {
  return messages.map(m => ({
    role: m.role,
    content: m.content,
    ...(m.role === 'assistant' && m.toolCalls?.length
      ? {
          tool_calls: m.toolCalls.map(tc => ({
            id: tc.id,
            type: 'function' as const,
            function: { name: tc.name, arguments: tc.arguments },
          })),
        }
      : {}),
  }));
}

export async function streamGroq(
  messages: ChatMessage[],
  callbacks: StreamCallbacks,
  signal?: AbortSignal,
): Promise<{ content: string; toolCalls?: { id: string; name: string; arguments: string }[] }> {
  const key = getApiKeys().groq;
  if (!key) throw new Error('No Groq API key configured');

  const model = localStorage.getItem('albert:preferred_model') || 'llama-3.3-70b-versatile';

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model,
      messages: buildGroqMessages(messages),
      tools: GROQ_TOOLS,
      stream: true,
    }),
    signal,
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Groq API error ${res.status}: ${err}`);
  }

  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let content = '';
  let toolCalls: { id: string; name: string; arguments: string }[] = [];
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed === 'data: [DONE]') continue;
      if (!trimmed.startsWith('data: ')) continue;

      try {
        const json = JSON.parse(trimmed.slice(6));
        const delta = json.choices?.[0]?.delta;
        if (!delta) continue;

        if (delta.content) {
          content += delta.content;
          callbacks.onChunk(delta.content);
        }

        if (delta.tool_calls) {
          for (const tc of delta.tool_calls) {
            const idx = tc.index ?? 0;
            if (!toolCalls[idx]) {
              toolCalls[idx] = { id: tc.id || '', name: '', arguments: '' };
            }
            if (tc.id) toolCalls[idx].id = tc.id;
            if (tc.function?.name) toolCalls[idx].name += tc.function.name;
            if (tc.function?.arguments) toolCalls[idx].arguments += tc.function.arguments;
          }
        }
      } catch {
        // skip malformed SSE
      }
    }
  }

  if (toolCalls.length && callbacks.onToolCall) {
    for (const tc of toolCalls) {
      callbacks.onToolCall(tc.name, tc.arguments);
    }
  }

  return { content, toolCalls: toolCalls.length ? toolCalls : undefined };
}

// ── Gemini streaming ──

function buildGeminiContents(messages: ChatMessage[]) {
  return messages
    .filter(m => m.role !== 'system')
    .map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));
}

export async function streamGemini(
  messages: ChatMessage[],
  callbacks: StreamCallbacks,
  signal?: AbortSignal,
): Promise<{ content: string; toolCalls?: { id: string; name: string; arguments: string }[] }> {
  const key = getApiKeys().gemini;
  if (!key) throw new Error('No Gemini API key configured');

  const systemMsg = messages.find(m => m.role === 'system');

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:streamGenerateContent?key=${key}&alt=sse`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: buildGeminiContents(messages),
        tools: GEMINI_TOOLS,
        ...(systemMsg ? { systemInstruction: { parts: [{ text: systemMsg.content }] } } : {}),
      }),
      signal,
    },
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gemini API error ${res.status}: ${err}`);
  }

  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let content = '';
  let toolCalls: { id: string; name: string; arguments: string }[] = [];
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith('data: ')) continue;

      try {
        const json = JSON.parse(trimmed.slice(6));
        const parts = json.candidates?.[0]?.content?.parts;
        if (!parts) continue;

        for (const part of parts) {
          if (part.text) {
            content += part.text;
            callbacks.onChunk(part.text);
          }
          if (part.functionCall) {
            const tc = {
              id: `gemini_${Date.now()}_${toolCalls.length}`,
              name: part.functionCall.name,
              arguments: JSON.stringify(part.functionCall.args || {}),
            };
            toolCalls.push(tc);
            callbacks.onToolCall?.(tc.name, tc.arguments);
          }
        }
      } catch {
        // skip malformed SSE
      }
    }
  }

  return { content, toolCalls: toolCalls.length ? toolCalls : undefined };
}
