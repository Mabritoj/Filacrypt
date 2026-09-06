import { describe, it, expect } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { server } from '../test/msw/server';
import { useUsageEvents } from './usageEvents';

function createWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe('useUsageEvents', () => {
  it('fetches usage events for the given workspaceId/spoolId', async () => {
    const usageEvent = {
      id: 'usage-1',
      spoolId: 'spool-1',
      workspaceId: 'ws-1',
      printJobName: 'Benchy',
      usedWeightG: 42,
      loggedBy: 'user-1',
      occurredAt: '2026-01-01T00:00:00.000Z',
    };
    server.use(
      http.get(`${import.meta.env.VITE_API_URL}/workspaces/ws-1/spools/spool-1/usage`, () =>
        HttpResponse.json({ usageEvents: [usageEvent] }),
      ),
    );

    const { result } = renderHook(() => useUsageEvents('ws-1', 'spool-1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.data).toEqual([usageEvent]));
  });
});
