import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch, parseApiError } from './client';
import type { Workspace } from './types';

async function fetchWorkspace(workspaceId: string): Promise<Workspace> {
  const response = await apiFetch(`/workspaces/${workspaceId}`);
  if (!response.ok)
    throw await parseApiError(response, `Failed to fetch workspace: ${response.status}`);
  const { workspace } = await response.json();
  return workspace;
}

export function useWorkspace(workspaceId: string) {
  return useQuery({
    queryKey: ['workspace', workspaceId],
    queryFn: () => fetchWorkspace(workspaceId),
    staleTime: Infinity,
    enabled: !!workspaceId,
  });
}

export type UpdateWorkspaceInput = Partial<
  Pick<
    Workspace,
    'lowStockThresholdG' | 'defaultDiameterMm' | 'defaultEmptySpoolWeightG' | 'defaultPrinterId'
  >
>;

export function useUpdateWorkspace(workspaceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: UpdateWorkspaceInput): Promise<Workspace> => {
      const response = await apiFetch(`/workspaces/${workspaceId}`, {
        method: 'PATCH',
        body: JSON.stringify(input),
      });
      if (!response.ok)
        throw await parseApiError(response, `Failed to update workspace: ${response.status}`);
      const { workspace } = await response.json();
      return workspace;
    },
    onSuccess: (workspace) => {
      // Merge, don't replace -- defense in depth alongside the backend fix
      // that makes PATCH's response include callerRole/callerFilamentPermissions
      // like GET's does. A future field the PATCH response happens to omit
      // should never silently drop out of the cache (useWorkspace has
      // staleTime: Infinity, so a stale/incomplete cache entry never
      // self-heals via refetch).
      queryClient.setQueryData<Workspace>(['workspace', workspaceId], (prev) =>
        prev ? { ...prev, ...workspace } : workspace,
      );
    },
  });
}
