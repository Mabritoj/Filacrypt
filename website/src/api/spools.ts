import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { apiFetch, parseApiError } from './client';
import type { Spool } from './types';

async function fetchSpools(workspaceId: string): Promise<Spool[]> {
  const response = await apiFetch(`/workspaces/${workspaceId}/spools`);
  if (!response.ok)
    throw await parseApiError(response, `Failed to fetch spools: ${response.status}`);
  const { spools } = await response.json();
  return spools;
}

export function useSpools(workspaceId: string) {
  return useQuery({
    queryKey: ['spools', workspaceId],
    queryFn: () => fetchSpools(workspaceId),
    staleTime: Infinity,
    enabled: !!workspaceId,
  });
}

async function fetchSpool(workspaceId: string, id: string): Promise<Spool | null> {
  const response = await apiFetch(`/workspaces/${workspaceId}/spools/${id}`);
  if (response.status === 404) return null;
  if (!response.ok)
    throw await parseApiError(response, `Failed to fetch spool: ${response.status}`);
  const { spool } = await response.json();
  return spool;
}

export function useSpool(workspaceId: string, id: string) {
  return useQuery({
    queryKey: ['spools', workspaceId, id],
    queryFn: () => fetchSpool(workspaceId, id),
    staleTime: Infinity,
    enabled: !!workspaceId && !!id,
  });
}

export type NewSpool = Omit<Spool, 'id' | 'createdAt' | 'updatedAt'>;

export function useUpdateSpool(workspaceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: Partial<Spool>;
    }): Promise<Spool> => {
      const response = await apiFetch(`/workspaces/${workspaceId}/spools/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(updates),
      });
      if (!response.ok)
        throw await parseApiError(response, `Failed to update spool: ${response.status}`);
      const { spool } = await response.json();
      return spool;
    },
    onSuccess: async (spool) => {
      queryClient.setQueryData(['spools', workspaceId, spool.id], spool);
      const existing = await queryClient.ensureQueryData({
        queryKey: ['spools', workspaceId],
        queryFn: () => fetchSpools(workspaceId),
        staleTime: Infinity,
      });
      queryClient.setQueryData<Spool[]>(
        ['spools', workspaceId],
        existing.map((s) => (s.id === spool.id ? spool : s)),
      );
    },
  });
}

export function useDeleteSpool(workspaceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const response = await apiFetch(`/workspaces/${workspaceId}/spools/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok)
        throw await parseApiError(response, `Failed to delete spool: ${response.status}`);
    },
    onSuccess: async (_data, id) => {
      queryClient.removeQueries({ queryKey: ['spools', workspaceId, id] });
      const existing = await queryClient.ensureQueryData({
        queryKey: ['spools', workspaceId],
        queryFn: () => fetchSpools(workspaceId),
        staleTime: Infinity,
      });
      queryClient.setQueryData<Spool[]>(
        ['spools', workspaceId],
        existing.filter((s) => s.id !== id),
      );
    },
  });
}

export function useAddSpool(workspaceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: NewSpool): Promise<Spool> => {
      const response = await apiFetch(`/workspaces/${workspaceId}/spools`, {
        method: 'POST',
        body: JSON.stringify(input),
      });
      if (!response.ok)
        throw await parseApiError(response, `Failed to create spool: ${response.status}`);
      const { spool } = await response.json();
      return spool;
    },
    onSuccess: async (spool) => {
      const existing = await queryClient.ensureQueryData({
        queryKey: ['spools', workspaceId],
        queryFn: () => fetchSpools(workspaceId),
        staleTime: Infinity,
      });
      queryClient.setQueryData<Spool[]>(['spools', workspaceId], [...existing, spool]);
      queryClient.setQueryData(['spools', workspaceId, spool.id], spool);
    },
  });
}
