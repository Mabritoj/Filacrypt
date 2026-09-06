import { useUser } from '../api/user';

export function useWorkspaceId(): string | undefined {
  const { data: user } = useUser();
  return user?.workspaceIds?.[0];
}
