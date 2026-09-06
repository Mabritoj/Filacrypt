import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { server } from '../test/msw/server';
import { useThemeStore } from '../stores/themeStore';

vi.mock('aws-amplify/auth', () => ({
  fetchAuthSession: vi.fn(),
}));

import { fetchAuthSession } from 'aws-amplify/auth';
import { RequireProfile } from './RequireProfile';

const mockFetchAuthSession = vi.mocked(fetchAuthSession);

function renderWithRouter() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/inventory']}>
        <Routes>
          <Route
            path="/inventory"
            element={
              <RequireProfile>
                <div>Protected content</div>
              </RequireProfile>
            }
          />
          <Route path="/setup" element={<div>Setup page</div>} />
          <Route path="/login" element={<div>Login page</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  useThemeStore.setState({ theme: 'dark' });
});

describe('RequireProfile', () => {
  it('syncs the theme store from the fetched profile preferences', async () => {
    mockFetchAuthSession.mockResolvedValue({ tokens: { idToken: {} } } as never);
    server.use(
      http.get(`${import.meta.env.VITE_API_URL}/me`, () =>
        HttpResponse.json({
          user: {
            id: 'u1',
            name: 'Jonathan',
            username: 'jmabrito',
            email: 'j@example.com',
            emailVerified: true,
            preferences: {
              weightUnit: 'g',
              temperatureUnit: 'C',
              lengthUnit: 'm',
              currency: 'USD',
              theme: 'light',
              defaultEntryMode: 'nfc',
            },
            createdAt: '2026-07-11T00:00:00.000Z',
          },
          workspaceIds: ['ws-1'],
        }),
      ),
    );

    renderWithRouter();
    await screen.findByText('Protected content');

    expect(useThemeStore.getState().theme).toBe('light');
  });

  it('renders children when authenticated and provisioned', async () => {
    mockFetchAuthSession.mockResolvedValue({ tokens: { idToken: {} } } as never);
    server.use(
      http.get(`${import.meta.env.VITE_API_URL}/me`, () =>
        HttpResponse.json({
          user: {
            id: 'u1',
            name: 'Jonathan',
            username: 'jmabrito',
            email: 'j@example.com',
            emailVerified: true,
            preferences: {
              weightUnit: 'g',
              temperatureUnit: 'C',
              lengthUnit: 'm',
              currency: 'USD',
              theme: 'dark',
              defaultEntryMode: 'nfc',
            },
            createdAt: '2026-07-11T00:00:00.000Z',
          },
          workspaceIds: ['ws-1'],
        }),
      ),
    );

    renderWithRouter();

    expect(await screen.findByText('Protected content')).toBeInTheDocument();
  });

  it('navigates to /login when there is no session', async () => {
    mockFetchAuthSession.mockResolvedValue({ tokens: undefined } as never);

    renderWithRouter();

    expect(await screen.findByText('Login page')).toBeInTheDocument();
    expect(screen.queryByText('Protected content')).not.toBeInTheDocument();
  });

  it('navigates to /setup when authenticated but not provisioned', async () => {
    mockFetchAuthSession.mockResolvedValue({ tokens: { idToken: {} } } as never);
    server.use(
      http.get(`${import.meta.env.VITE_API_URL}/me`, () =>
        HttpResponse.json(
          { error: { code: 'NOT_FOUND', message: 'User not found' } },
          { status: 404 },
        ),
      ),
    );

    renderWithRouter();

    expect(await screen.findByText('Setup page')).toBeInTheDocument();
    expect(screen.queryByText('Protected content')).not.toBeInTheDocument();
  });

  it('renders an error state when the profile query fails', async () => {
    mockFetchAuthSession.mockResolvedValue({ tokens: { idToken: {} } } as never);
    server.use(
      http.get(`${import.meta.env.VITE_API_URL}/me`, () =>
        HttpResponse.json(
          { error: { code: 'INTERNAL_ERROR', message: 'Something broke' } },
          { status: 500 },
        ),
      ),
    );

    renderWithRouter();

    expect(
      await screen.findByText(
        'Something went wrong loading your profile. Please refresh the page.',
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText('Protected content')).not.toBeInTheDocument();
    expect(screen.queryByText('Setup page')).not.toBeInTheDocument();
  });

  it('renders an error state when fetchAuthSession rejects', async () => {
    mockFetchAuthSession.mockRejectedValue(new Error('network error'));
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    renderWithRouter();

    expect(
      await screen.findByText('Something went wrong signing you in. Please refresh the page.'),
    ).toBeInTheDocument();
    expect(screen.queryByText('Protected content')).not.toBeInTheDocument();
    expect(screen.queryByText('Setup page')).not.toBeInTheDocument();

    consoleErrorSpy.mockRestore();
  });
});
