import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { User, UserPreferences } from './types';
import { apiFetch, parseApiError } from './client';

export interface UserWithWorkspaces extends User {
  workspaceIds: string[];
}

export interface DeletionImpactWorkspace {
  workspaceId: string;
  name: string;
  members: { userId: string; name: string; role: string }[];
}

export type WorkspaceResolution = { action: 'reassign'; newOwnerId: string } | { action: 'delete' };

async function fetchDeletionImpact(): Promise<DeletionImpactWorkspace[]> {
  const response = await apiFetch('/me/deletion-impact');
  if (!response.ok)
    throw await parseApiError(
      response,
      `Failed to check account deletion impact: ${response.status}`,
    );
  const { workspaces } = await response.json();
  return workspaces;
}

export function useDeletionImpact() {
  return useQuery({
    queryKey: ['deletionImpact'],
    queryFn: fetchDeletionImpact,
  });
}

async function fetchUser(): Promise<UserWithWorkspaces | null> {
  const response = await apiFetch('/me');
  if (response.status === 404) {
    return null;
  }
  if (!response.ok) {
    throw await parseApiError(response, `Failed to fetch user: ${response.status}`);
  }
  const { user, workspaceIds } = await response.json();
  return { ...user, workspaceIds };
}

export function useUser() {
  return useQuery({
    queryKey: ['user'],
    queryFn: fetchUser,
    staleTime: Infinity,
  });
}

const DEFAULT_PREFERENCES: UserPreferences = {
  weightUnit: 'g',
  temperatureUnit: 'C',
  lengthUnit: 'm',
  currency: 'USD',
  theme: 'dark',
  defaultEntryMode: 'nfc',
};

export function usePreferences(): UserPreferences {
  const { data } = useUser();
  return data?.preferences ?? DEFAULT_PREFERENCES;
}

export interface SetupProfileInput {
  name: string;
  username: string;
}

export function useSetupProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: SetupProfileInput): Promise<UserWithWorkspaces> => {
      const response = await apiFetch('/user/setup', {
        method: 'POST',
        body: JSON.stringify(input),
      });
      if (!response.ok)
        throw await parseApiError(response, `Failed to set up profile: ${response.status}`);
      const { user, workspaceIds } = await response.json();
      return { ...user, workspaceIds };
    },
    onSuccess: (user) => {
      queryClient.setQueryData(['user'], user);
    },
  });
}

export function useUpdateUserPreferences() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (preferences: Partial<UserPreferences>): Promise<User> => {
      const response = await apiFetch('/me', {
        method: 'PATCH',
        body: JSON.stringify({ preferences }),
      });
      if (!response.ok)
        throw await parseApiError(response, `Failed to update preferences: ${response.status}`);
      const { user } = await response.json();
      return user;
    },
    onSuccess: (user) => {
      queryClient.setQueryData(['user'], (current: UserWithWorkspaces | null | undefined) =>
        current ? { ...current, ...user } : current,
      );
    },
  });
}

export function useDeleteAccount() {
  return useMutation({
    mutationFn: async (input: {
      workspaceResolutions: Record<string, WorkspaceResolution>;
    }): Promise<void> => {
      const response = await apiFetch('/me', {
        method: 'DELETE',
        body: JSON.stringify({ workspaceResolutions: input.workspaceResolutions }),
      });
      if (!response.ok)
        throw await parseApiError(response, `Failed to delete account: ${response.status}`);
    },
  });
}
