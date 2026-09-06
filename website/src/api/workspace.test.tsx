import type { ReactNode } from 'react';
import { describe, it, expect } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { server } from '../test/msw/server';
import { useWorkspace, useUpdateWorkspace } from './workspace';

const MOCK_WORKSPACE = {
  id: 'ws-1',
  name: 'My Workspace',
  ownerId: 'user-1',
  lowStockThresholdG: 200,
  defaultDiameterMm: 1.75,
  defaultEmptySpoolWeightG: 215,
  createdAt: '2026-01-01T00:00:00.000Z',
};

function createWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe('useWorkspace', () => {
  it('fetches the workspace for the given workspaceId', async () => {
    server.use(
      http.get(`${import.meta.env.VITE_API_URL}/workspaces/ws-1`, () =>
        HttpResponse.json({ workspace: MOCK_WORKSPACE }),
      ),
    );

    const { result } = renderHook(() => useWorkspace('ws-1'), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.data).toEqual(MOCK_WORKSPACE));
  });

  it('surfaces the fixed message on a 403', async () => {
    server.use(
      http.get(
        `${import.meta.env.VITE_API_URL}/workspaces/ws-1`,
        () => new HttpResponse(null, { status: 403 }),
      ),
    );

    const { result } = renderHook(() => useWorkspace('ws-1'), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe("You don't have permission to do that.");
  });
});

describe('useUpdateWorkspace', () => {
  it('PATCHes the given fields and updates the cache', async () => {
    server.use(
      http.patch(`${import.meta.env.VITE_API_URL}/workspaces/ws-1`, async ({ request }) => {
        const body = await request.json();
        expect(body).toEqual({ lowStockThresholdG: 100 });
        return HttpResponse.json({ workspace: { ...MOCK_WORKSPACE, lowStockThresholdG: 100 } });
      }),
    );

    const { result } = renderHook(() => useUpdateWorkspace('ws-1'), { wrapper: createWrapper() });

    const updated = await result.current.mutateAsync({ lowStockThresholdG: 100 });

    expect(updated.lowStockThresholdG).toBe(100);
  });

  it('surfaces the fixed message on a 403', async () => {
    server.use(
      http.patch(
        `${import.meta.env.VITE_API_URL}/workspaces/ws-1`,
        () => new HttpResponse(null, { status: 403 }),
      ),
    );

    const { result } = renderHook(() => useUpdateWorkspace('ws-1'), { wrapper: createWrapper() });
    result.current.mutate({ lowStockThresholdG: 100 });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe("You don't have permission to do that.");
  });

  it('merges the PATCH response into the cache instead of replacing it, so fields the response omits survive', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    // Seed the cache the way a prior GET would -- carrying callerRole and
    // callerFilamentPermissions, which the backend PATCH response can omit.
    queryClient.setQueryData(['workspace', 'ws-1'], {
      ...MOCK_WORKSPACE,
      callerRole: 'admin',
      callerFilamentPermissions: { create: true, read: true, update: true, delete: false },
    });

    server.use(
      http.patch(`${import.meta.env.VITE_API_URL}/workspaces/ws-1`, () =>
        HttpResponse.json({ workspace: { ...MOCK_WORKSPACE, lowStockThresholdG: 100 } }),
      ),
    );

    const { result } = renderHook(() => useUpdateWorkspace('ws-1'), { wrapper });
    await result.current.mutateAsync({ lowStockThresholdG: 100 });

    expect(queryClient.getQueryData(['workspace', 'ws-1'])).toEqual({
      ...MOCK_WORKSPACE,
      lowStockThresholdG: 100,
      callerRole: 'admin',
      callerFilamentPermissions: { create: true, read: true, update: true, delete: false },
    });
  });
});
