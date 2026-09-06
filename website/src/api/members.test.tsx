import type { ReactNode } from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { server } from '../test/msw/server';
import {
  useMembers,
  useInviteMember,
  useUpdateMemberRole,
  useUpdateMemberPermissions,
  useRemoveMember,
} from './members';
import { mockMembers } from './mock/members';

const API_URL = import.meta.env.VITE_API_URL;

function createWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

test('useMembers fetches the roster', async () => {
  server.use(
    http.get(`${API_URL}/workspaces/workspace-1/members`, () =>
      HttpResponse.json({ members: mockMembers }),
    ),
  );

  const { result } = renderHook(() => useMembers('workspace-1'), { wrapper: createWrapper() });

  await waitFor(() => expect(result.current.data).toEqual(mockMembers));
});

test('useInviteMember posts the email and returns the new member', async () => {
  const newMember = mockMembers[2];
  server.use(
    http.post(`${API_URL}/workspaces/workspace-1/members`, () =>
      HttpResponse.json({ member: newMember }, { status: 201 }),
    ),
  );

  const { result } = renderHook(() => useInviteMember('workspace-1'), { wrapper: createWrapper() });

  result.current.mutate({ email: 'hedy@example.com' });

  await waitFor(() => expect(result.current.data).toEqual(newMember));
});

test('useUpdateMemberRole patches the role', async () => {
  const updated = { ...mockMembers[2], role: 'admin' as const };
  server.use(
    http.patch(`${API_URL}/workspaces/workspace-1/members/user-3/role`, () =>
      HttpResponse.json({ member: updated }),
    ),
  );

  const { result } = renderHook(() => useUpdateMemberRole('workspace-1'), {
    wrapper: createWrapper(),
  });

  result.current.mutate({ userId: 'user-3', role: 'admin' });

  await waitFor(() => expect(result.current.data).toEqual(updated));
});

test('useUpdateMemberPermissions patches the permissions', async () => {
  const updated = {
    ...mockMembers[2],
    filamentPermissions: { create: true, read: true, update: false, delete: false },
  };
  server.use(
    http.patch(`${API_URL}/workspaces/workspace-1/members/user-3/permissions`, () =>
      HttpResponse.json({ member: updated }),
    ),
  );

  const { result } = renderHook(() => useUpdateMemberPermissions('workspace-1'), {
    wrapper: createWrapper(),
  });

  result.current.mutate({ userId: 'user-3', filamentPermissions: { create: true } });

  await waitFor(() => expect(result.current.data).toEqual(updated));
});

test('useRemoveMember deletes the member', async () => {
  server.use(
    http.delete(
      `${API_URL}/workspaces/workspace-1/members/user-3`,
      () => new HttpResponse(null, { status: 204 }),
    ),
  );

  const { result } = renderHook(() => useRemoveMember('workspace-1'), { wrapper: createWrapper() });

  result.current.mutate({ userId: 'user-3' });

  await waitFor(() => expect(result.current.isSuccess).toBe(true));
});

test('a 403 from any member mutation surfaces the fixed permission-denied message', async () => {
  server.use(
    http.post(
      `${API_URL}/workspaces/workspace-1/members`,
      () => new HttpResponse(null, { status: 403 }),
    ),
  );

  const { result } = renderHook(() => useInviteMember('workspace-1'), { wrapper: createWrapper() });

  result.current.mutate({ email: 'nobody@example.com' });

  await waitFor(() => expect(result.current.isError).toBe(true));
  expect(result.current.error?.message).toBe("You don't have permission to do that.");
});
