import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch, parseApiError } from './client';
import type { FilamentPermissions, WorkspaceMember } from './types';

async function fetchMembers(workspaceId: string): Promise<WorkspaceMember[]> {
  const response = await apiFetch(`/workspaces/${workspaceId}/members`);
  if (!response.ok)
    throw await parseApiError(response, `Failed to fetch members: ${response.status}`);
  const { members } = await response.json();
  return members;
}

export function useMembers(workspaceId: string) {
  return useQuery({
    queryKey: ['members', workspaceId],
    queryFn: () => fetchMembers(workspaceId),
    enabled: !!workspaceId,
  });
}

function replaceMember(
  queryClient: ReturnType<typeof useQueryClient>,
  workspaceId: string,
  member: WorkspaceMember,
) {
  queryClient.setQueryData<WorkspaceMember[]>(['members', workspaceId], (existing) =>
    existing ? [...existing.filter((m) => m.userId !== member.userId), member] : [member],
  );
}

export function useInviteMember(workspaceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ email }: { email: string }): Promise<WorkspaceMember> => {
      const response = await apiFetch(`/workspaces/${workspaceId}/members`, {
        method: 'POST',
        body: JSON.stringify({ email }),
      });
      if (!response.ok)
        throw await parseApiError(response, `Failed to invite member: ${response.status}`);
      const { member } = await response.json();
      return member;
    },
    onSuccess: (member) => replaceMember(queryClient, workspaceId, member),
  });
}

export function useUpdateMemberRole(workspaceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      userId,
      role,
    }: {
      userId: string;
      role: 'admin' | 'member';
    }): Promise<WorkspaceMember> => {
      const response = await apiFetch(`/workspaces/${workspaceId}/members/${userId}/role`, {
        method: 'PATCH',
        body: JSON.stringify({ role }),
      });
      if (!response.ok)
        throw await parseApiError(response, `Failed to update role: ${response.status}`);
      const { member } = await response.json();
      return member;
    },
    onSuccess: (member) => replaceMember(queryClient, workspaceId, member),
  });
}

export function useUpdateMemberPermissions(workspaceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      userId,
      filamentPermissions,
    }: {
      userId: string;
      filamentPermissions: Partial<FilamentPermissions>;
    }): Promise<WorkspaceMember> => {
      const response = await apiFetch(`/workspaces/${workspaceId}/members/${userId}/permissions`, {
        method: 'PATCH',
        body: JSON.stringify({ filamentPermissions }),
      });
      if (!response.ok)
        throw await parseApiError(response, `Failed to update permissions: ${response.status}`);
      const { member } = await response.json();
      return member;
    },
    onSuccess: (member) => replaceMember(queryClient, workspaceId, member),
  });
}

export function useRemoveMember(workspaceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId }: { userId: string }): Promise<void> => {
      const response = await apiFetch(`/workspaces/${workspaceId}/members/${userId}`, {
        method: 'DELETE',
      });
      if (!response.ok)
        throw await parseApiError(response, `Failed to remove member: ${response.status}`);
    },
    onSuccess: (_data, { userId }) => {
      queryClient.setQueryData<WorkspaceMember[]>(['members', workspaceId], (existing) =>
        existing?.filter((m) => m.userId !== userId),
      );
    },
  });
}
