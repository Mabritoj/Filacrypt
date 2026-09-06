import { useCallback, useState } from 'react';
import { fetchAuthSession } from 'aws-amplify/auth';

/**
 * Mirrors the backend union in handlers/chat/stream.ts. The website and the
 * backend are independent TypeScript projects with no shared package, so this
 * is hand-matched rather than imported -- same arrangement docs/api.md
 * describes for the domain types. Keep both copies in sync.
 */
export type ChatEvent =
  | { type: 'text'; delta: string }
  | { type: 'spools'; ids: string[] }
  | { type: 'error'; message: string }
  | { type: 'done' };

export interface ChatMessage {
  role: 'user' | 'assistant';
  text: string;
  spoolIds: string[];
}

interface WireMessage {
  role: string;
  content: string;
}

export function useChatStream(workspaceId: string) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const send = useCallback(
    async (text: string) => {
      if (!text.trim() || isStreaming) return;

      // Vite inlines env vars at build time, so a missing VITE_CHAT_URL is baked
      // into the bundle as undefined. Without this guard fetch(undefined) coerces
      // to the string "undefined" and POSTs to <origin>/undefined -- a 404 that
      // looks like a routing bug rather than a misconfigured build.
      const chatUrl = import.meta.env.VITE_CHAT_URL;
      if (!chatUrl) {
        setError('Chat is not configured for this build (VITE_CHAT_URL is unset).');
        return;
      }

      setError(null);
      setIsStreaming(true);

      const history: WireMessage[] = [
        ...messages.map((m) => ({ role: m.role, content: m.text })),
        { role: 'user', content: text },
      ];

      setMessages((prev) => [
        ...prev,
        { role: 'user', text, spoolIds: [] },
        { role: 'assistant', text: '', spoolIds: [] },
      ]);

      try {
        const session = await fetchAuthSession();
        const idToken = session.tokens?.idToken?.toString();

        const response = await fetch(chatUrl, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${idToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ workspaceId, messages: history }),
        });

        if (!response.ok || !response.body) {
          throw new Error(`Chat request failed: ${response.status}`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        // A chunk can end mid-JSON, so hold the trailing partial line back
        // until the next chunk completes it.
        let buffer = '';

        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() ?? '';

          for (const line of lines) {
            if (!line.trim()) continue;
            const event = JSON.parse(line) as ChatEvent;
            applyEvent(event, setMessages, setError);
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Something went wrong.');
      } finally {
        setIsStreaming(false);
      }
    },
    [messages, workspaceId, isStreaming],
  );

  return { messages, isStreaming, error, send };
}

function applyEvent(
  event: ChatEvent,
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>,
  setError: React.Dispatch<React.SetStateAction<string | null>>,
) {
  if (event.type === 'error') {
    setError(event.message);
    return;
  }
  if (event.type === 'done') return;

  setMessages((prev) => {
    const next = [...prev];
    const last = next[next.length - 1];
    if (!last || last.role !== 'assistant') return prev;

    if (event.type === 'text') {
      next[next.length - 1] = { ...last, text: last.text + event.delta };
    } else {
      const merged = [...new Set([...last.spoolIds, ...event.ids])];
      next[next.length - 1] = { ...last, spoolIds: merged };
    }
    return next;
  });
}
