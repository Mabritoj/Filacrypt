import { useQuery } from '@tanstack/react-query';
import { apiFetch } from './client';
import type { UsageEvent } from './types';

async function fetchUsageEvents(workspaceId: string, spoolId: string): Promise<UsageEvent[]> {
  const response = await apiFetch(`/workspaces/${workspaceId}/spools/${spoolId}/usage`);
  if (!response.ok) throw new Error(`Failed to fetch usage events: ${response.status}`);
  const { usageEvents } = await response.json();
  return usageEvents;
}

export function useUsageEvents(workspaceId: string, spoolId: string) {
  return useQuery({
    queryKey: ['usageEvents', workspaceId, spoolId],
    queryFn: () => fetchUsageEvents(workspaceId, spoolId),
    enabled: !!workspaceId && !!spoolId,
  });
}
