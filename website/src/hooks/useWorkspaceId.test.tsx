import { describe, it, expect } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { server } from '../test/msw/server';
import { mockUser } from '../api/mock/user';
import { useWorkspaceId } from './useWorkspaceId';

function createWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe('useWorkspaceId', () => {
  it('returns the first workspace id from the current user', async () => {
    server.use(
      http.get(`${import.meta.env.VITE_API_URL}/me`, () =>
        HttpResponse.json({ user: mockUser, workspaceIds: ['ws-1', 'ws-2'] }),
      ),
    );

    const { result } = renderHook(() => useWorkspaceId(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current).toBe('ws-1'));
  });

  it('returns undefined before the user has loaded', () => {
    server.use(
      http.get(`${import.meta.env.VITE_API_URL}/me`, () =>
        HttpResponse.json({ user: mockUser, workspaceIds: [] }),
      ),
    );

    const { result } = renderHook(() => useWorkspaceId(), { wrapper: createWrapper() });

    expect(result.current).toBeUndefined();
  });
});
