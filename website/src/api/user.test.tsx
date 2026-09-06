import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { server } from '../test/msw/server';
import {
  useSetupProfile,
  useUpdateUserPreferences,
  useDeleteAccount,
  useDeletionImpact,
  useUser,
} from './user';
import { mockUser } from './mock/user';
import { mockDeletionImpact } from './mock/deletionImpact';

function createWrapperWithClient() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return { Wrapper, queryClient };
}

describe('useUser', () => {
  it('resolves with the profile when GET /me succeeds', async () => {
    server.use(
      http.get(`${import.meta.env.VITE_API_URL}/me`, () =>
        HttpResponse.json({ user: mockUser, workspaceIds: ['ws-1'] }),
      ),
    );
    const { Wrapper } = createWrapperWithClient();
    const { result } = renderHook(() => useUser(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual({ ...mockUser, workspaceIds: ['ws-1'] });
  });

  it('also exposes workspaceIds from the /me response', async () => {
    server.use(
      http.get(`${import.meta.env.VITE_API_URL}/me`, () =>
        HttpResponse.json({ user: mockUser, workspaceIds: ['ws-1', 'ws-2'] }),
      ),
    );
    const { Wrapper } = createWrapperWithClient();
    const { result } = renderHook(() => useUser(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.data).toBeTruthy());

    expect(result.current.data?.workspaceIds).toEqual(['ws-1', 'ws-2']);
  });

  it('resolves with null when GET /me returns 404 (not yet provisioned)', async () => {
    server.use(
      http.get(`${import.meta.env.VITE_API_URL}/me`, () =>
        HttpResponse.json(
          { error: { code: 'NOT_FOUND', message: 'User not found' } },
          { status: 404 },
        ),
      ),
    );
    const { Wrapper } = createWrapperWithClient();
    const { result } = renderHook(() => useUser(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toBeNull();
  });
});

describe('useSetupProfile', () => {
  it('posts the profile and caches the returned user', async () => {
    server.use(
      http.post(`${import.meta.env.VITE_API_URL}/user/setup`, () =>
        HttpResponse.json({ user: mockUser, workspaceIds: ['ws-1'] }, { status: 201 }),
      ),
    );
    const { Wrapper, queryClient } = createWrapperWithClient();
    const { result } = renderHook(() => useSetupProfile(), { wrapper: Wrapper });

    act(() => {
      result.current.mutate({ name: mockUser.name, username: mockUser.username });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual({ ...mockUser, workspaceIds: ['ws-1'] });
    expect(queryClient.getQueryData(['user'])).toEqual({ ...mockUser, workspaceIds: ['ws-1'] });
  });

  it('also caches workspaceIds from the response', async () => {
    server.use(
      http.post(`${import.meta.env.VITE_API_URL}/user/setup`, () =>
        HttpResponse.json({ user: mockUser, workspaceIds: ['ws-new'] }, { status: 201 }),
      ),
    );
    const { Wrapper, queryClient } = createWrapperWithClient();
    const { result } = renderHook(() => useSetupProfile(), { wrapper: Wrapper });

    await act(async () => {
      await result.current.mutateAsync({ name: 'Jonathan', username: 'jmabrito' });
    });

    expect(queryClient.getQueryData<{ workspaceIds: string[] }>(['user'])?.workspaceIds).toEqual([
      'ws-new',
    ]);
  });

  it('surfaces the backend error message on failure', async () => {
    server.use(
      http.post(`${import.meta.env.VITE_API_URL}/user/setup`, () =>
        HttpResponse.json(
          { error: { code: 'USERNAME_TAKEN', message: 'Username is already taken' } },
          { status: 409 },
        ),
      ),
    );
    const { Wrapper } = createWrapperWithClient();
    const { result } = renderHook(() => useSetupProfile(), { wrapper: Wrapper });

    act(() => {
      result.current.mutate({ name: 'Jonathan', username: 'taken' });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error?.message).toBe('Username is already taken');
  });
});

describe('useUpdateUserPreferences', () => {
  it('PATCHes /me with only the preferences body and updates the cache', async () => {
    let requestBody: unknown;
    server.use(
      http.patch(`${import.meta.env.VITE_API_URL}/me`, async ({ request }) => {
        requestBody = await request.json();
        return HttpResponse.json({
          user: { ...mockUser, preferences: { ...mockUser.preferences, weightUnit: 'kg' } },
        });
      }),
    );
    const { Wrapper, queryClient } = createWrapperWithClient();
    queryClient.setQueryData(['user'], { ...mockUser, workspaceIds: ['ws-1'] });
    const { result } = renderHook(() => useUpdateUserPreferences(), { wrapper: Wrapper });

    act(() => {
      result.current.mutate({ weightUnit: 'kg' });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(requestBody).toEqual({ preferences: { weightUnit: 'kg' } });
    expect(result.current.data?.preferences.weightUnit).toBe('kg');
    expect(
      queryClient.getQueryData<{ preferences: { weightUnit: string } }>(['user'])?.preferences
        .weightUnit,
    ).toBe('kg');
  });

  it('surfaces the backend error message on failure', async () => {
    server.use(
      http.patch(`${import.meta.env.VITE_API_URL}/me`, () =>
        HttpResponse.json(
          { error: { code: 'VALIDATION_ERROR', message: 'weightUnit must be one of: g, kg' } },
          { status: 400 },
        ),
      ),
    );
    const { Wrapper } = createWrapperWithClient();
    const { result } = renderHook(() => useUpdateUserPreferences(), { wrapper: Wrapper });

    act(() => {
      result.current.mutate({ weightUnit: 'lbs' as never });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error?.message).toBe('weightUnit must be one of: g, kg');
  });
});

describe('useDeleteAccount', () => {
  it('calls DELETE /me', async () => {
    let called = false;
    server.use(
      http.delete(`${import.meta.env.VITE_API_URL}/me`, () => {
        called = true;
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const { Wrapper } = createWrapperWithClient();
    const { result } = renderHook(() => useDeleteAccount(), { wrapper: Wrapper });

    act(() => {
      result.current.mutate({ workspaceResolutions: {} });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(called).toBe(true);
  });

  it('surfaces the backend error message on failure', async () => {
    server.use(
      http.delete(`${import.meta.env.VITE_API_URL}/me`, () =>
        HttpResponse.json(
          { error: { code: 'NOT_FOUND', message: 'User not found' } },
          { status: 404 },
        ),
      ),
    );
    const { Wrapper } = createWrapperWithClient();
    const { result } = renderHook(() => useDeleteAccount(), { wrapper: Wrapper });

    act(() => {
      result.current.mutate({ workspaceResolutions: {} });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe('User not found');
  });

  it('surfaces the fixed message on a 403', async () => {
    server.use(
      http.delete(
        `${import.meta.env.VITE_API_URL}/me`,
        () => new HttpResponse(null, { status: 403 }),
      ),
    );
    const { Wrapper } = createWrapperWithClient();
    const { result } = renderHook(() => useDeleteAccount(), { wrapper: Wrapper });

    act(() => {
      result.current.mutate({ workspaceResolutions: {} });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe("You don't have permission to do that.");
  });

  it('posts the resolutions in the request body', async () => {
    server.use(
      http.delete(`${import.meta.env.VITE_API_URL}/me`, async ({ request }) => {
        const body = await request.json();
        expect(body).toEqual({ workspaceResolutions: { 'ws-1': { action: 'delete' } } });
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const { Wrapper } = createWrapperWithClient();
    const { result } = renderHook(() => useDeleteAccount(), { wrapper: Wrapper });

    act(() => {
      result.current.mutate({ workspaceResolutions: { 'ws-1': { action: 'delete' } } });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe('useDeletionImpact', () => {
  it('fetches workspaces needing a resolution', async () => {
    server.use(
      http.get(`${import.meta.env.VITE_API_URL}/me/deletion-impact`, () =>
        HttpResponse.json({ workspaces: mockDeletionImpact }),
      ),
    );
    const { Wrapper } = createWrapperWithClient();
    const { result } = renderHook(() => useDeletionImpact(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.data).toEqual(mockDeletionImpact));
  });
});
