import { describe, it, expect } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { server } from '../test/msw/server';
import { useSpools, useSpool, useAddSpool, useUpdateSpool, useDeleteSpool } from './spools';
import type { Spool } from './types';

const MOCK_SPOOL: Spool = {
  id: 'spool-1',
  workspaceId: 'ws-1',
  brand: 'Prusament',
  materialType: 'PLA',
  materialName: 'Galaxy Black',
  tags: ['glitter'],
  netWeightG: 1000,
  remainingWeightG: 1000,
  filamentDiameterMm: 1.75,
  status: 'in_use',
  addedBy: 'user-1',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

function createWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe('useSpools', () => {
  it('fetches the spool list for the given workspaceId', async () => {
    server.use(
      http.get(`${import.meta.env.VITE_API_URL}/workspaces/ws-1/spools`, () =>
        HttpResponse.json({ spools: [MOCK_SPOOL] }),
      ),
    );

    const { result } = renderHook(() => useSpools('ws-1'), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.data).toEqual([MOCK_SPOOL]));
  });

  it('surfaces the fixed message on a 403', async () => {
    server.use(
      http.get(
        `${import.meta.env.VITE_API_URL}/workspaces/ws-1/spools`,
        () => new HttpResponse(null, { status: 403 }),
      ),
    );

    const { result } = renderHook(() => useSpools('ws-1'), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe("You don't have permission to do that.");
  });
});

describe('useSpool', () => {
  it('fetches one spool by id', async () => {
    server.use(
      http.get(`${import.meta.env.VITE_API_URL}/workspaces/ws-1/spools/spool-1`, () =>
        HttpResponse.json({ spool: MOCK_SPOOL }),
      ),
    );

    const { result } = renderHook(() => useSpool('ws-1', 'spool-1'), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.data).toEqual(MOCK_SPOOL));
  });

  it('returns null for a 404', async () => {
    server.use(
      http.get(`${import.meta.env.VITE_API_URL}/workspaces/ws-1/spools/missing`, () =>
        HttpResponse.json(
          { error: { code: 'NOT_FOUND', message: 'Spool not found' } },
          { status: 404 },
        ),
      ),
    );

    const { result } = renderHook(() => useSpool('ws-1', 'missing'), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBeNull();
  });
});

describe('useUpdateSpool', () => {
  it('surfaces the fixed message on a 403', async () => {
    server.use(
      http.patch(
        `${import.meta.env.VITE_API_URL}/workspaces/ws-1/spools/spool-1`,
        () => new HttpResponse(null, { status: 403 }),
      ),
    );

    const { result } = renderHook(() => useUpdateSpool('ws-1'), { wrapper: createWrapper() });
    result.current.mutate({ id: 'spool-1', updates: { status: 'archived' as const } });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe("You don't have permission to do that.");
  });
});

describe('useDeleteSpool', () => {
  it('surfaces the fixed message on a 403', async () => {
    server.use(
      http.delete(
        `${import.meta.env.VITE_API_URL}/workspaces/ws-1/spools/spool-1`,
        () => new HttpResponse(null, { status: 403 }),
      ),
    );

    const { result } = renderHook(() => useDeleteSpool('ws-1'), { wrapper: createWrapper() });
    result.current.mutate('spool-1');

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe("You don't have permission to do that.");
  });
});

describe('useAddSpool', () => {
  it('POSTs the new spool and updates both caches on success', async () => {
    server.use(
      // useAddSpool's onSuccess calls ensureQueryData on the list query key to merge
      // the new spool in; with a fresh QueryClient (no prior ['spools', 'ws-1'] cache)
      // that triggers a real GET, so it must be mocked here too, not just the POST.
      http.get(`${import.meta.env.VITE_API_URL}/workspaces/ws-1/spools`, () =>
        HttpResponse.json({ spools: [] }),
      ),
      http.post(`${import.meta.env.VITE_API_URL}/workspaces/ws-1/spools`, () =>
        HttpResponse.json({ spool: MOCK_SPOOL }, { status: 201 }),
      ),
    );

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { result } = renderHook(() => useAddSpool('ws-1'), {
      wrapper: ({ children }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      ),
    });

    const { id, createdAt, updatedAt, ...input } = MOCK_SPOOL;
    void id;
    void createdAt;
    void updatedAt;
    await result.current.mutateAsync(input);

    expect(queryClient.getQueryData(['spools', 'ws-1'])).toEqual([MOCK_SPOOL]);
    expect(queryClient.getQueryData(['spools', 'ws-1', 'spool-1'])).toEqual(MOCK_SPOOL);
  });

  it('surfaces the fixed message on a 403', async () => {
    server.use(
      http.post(
        `${import.meta.env.VITE_API_URL}/workspaces/ws-1/spools`,
        () => new HttpResponse(null, { status: 403 }),
      ),
    );

    const { result } = renderHook(() => useAddSpool('ws-1'), { wrapper: createWrapper() });
    const { id, createdAt, updatedAt, ...input } = MOCK_SPOOL;
    void id;
    void createdAt;
    void updatedAt;
    result.current.mutate(input);

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe("You don't have permission to do that.");
  });
});
