import { describe, expect, test, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useChatStream } from './useChatStream';

vi.mock('aws-amplify/auth', () => ({
  fetchAuthSession: vi.fn().mockResolvedValue({
    tokens: { idToken: { toString: () => 'test-id-token' } },
  }),
}));

/** Streams the given chunks as a fetch Response body. */
function mockFetchStreaming(chunks: string[]) {
  const encoder = new TextEncoder();
  return vi.fn().mockResolvedValue({
    ok: true,
    body: new ReadableStream({
      start(controller) {
        for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
        controller.close();
      },
    }),
  });
}

beforeEach(() => vi.clearAllMocks());
afterEach(() => vi.unstubAllEnvs());

describe('useChatStream', () => {
  test('accumulates text deltas into one assistant message', async () => {
    vi.stubGlobal(
      'fetch',
      mockFetchStreaming([
        '{"type":"text","delta":"You have "}\n',
        '{"type":"text","delta":"3 spools."}\n',
        '{"type":"done"}\n',
      ]),
    );

    const { result } = renderHook(() => useChatStream('ws-1'));
    await act(async () => {
      await result.current.send('how many?');
    });

    await waitFor(() => expect(result.current.isStreaming).toBe(false));
    expect(result.current.messages.at(-1)).toMatchObject({
      role: 'assistant',
      text: 'You have 3 spools.',
    });
  });

  test('reassembles a JSON object split across two chunks', async () => {
    vi.stubGlobal(
      'fetch',
      mockFetchStreaming(['{"type":"text","del', 'ta":"split"}\n{"type":"done"}\n']),
    );

    const { result } = renderHook(() => useChatStream('ws-1'));
    await act(async () => {
      await result.current.send('hi');
    });

    await waitFor(() => expect(result.current.isStreaming).toBe(false));
    expect(result.current.messages.at(-1)?.text).toBe('split');
  });

  test('collects spool ids and de-duplicates them', async () => {
    vi.stubGlobal(
      'fetch',
      mockFetchStreaming([
        '{"type":"spools","ids":["a","b"]}\n',
        '{"type":"spools","ids":["b","c"]}\n',
        '{"type":"done"}\n',
      ]),
    );

    const { result } = renderHook(() => useChatStream('ws-1'));
    await act(async () => {
      await result.current.send('black?');
    });

    await waitFor(() => expect(result.current.isStreaming).toBe(false));
    expect(result.current.messages.at(-1)?.spoolIds).toEqual(['a', 'b', 'c']);
  });

  test('surfaces an error event', async () => {
    vi.stubGlobal(
      'fetch',
      mockFetchStreaming(['{"type":"error","message":"boom"}\n{"type":"done"}\n']),
    );

    const { result } = renderHook(() => useChatStream('ws-1'));
    await act(async () => {
      await result.current.send('hi');
    });

    await waitFor(() => expect(result.current.error).toBe('boom'));
  });

  test('refuses to send when VITE_CHAT_URL is missing from the build', async () => {
    vi.stubEnv('VITE_CHAT_URL', '');
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);

    const { result } = renderHook(() => useChatStream('ws-1'));
    await act(async () => {
      await result.current.send('hi');
    });

    // Without the guard this POSTs to <origin>/undefined instead of erroring.
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(result.current.error).toMatch(/not configured/i);
  });

  test('records the user message immediately', async () => {
    vi.stubGlobal('fetch', mockFetchStreaming(['{"type":"done"}\n']));

    const { result } = renderHook(() => useChatStream('ws-1'));
    await act(async () => {
      await result.current.send('what black filament?');
    });

    expect(result.current.messages[0]).toMatchObject({
      role: 'user',
      text: 'what black filament?',
    });
  });
});
