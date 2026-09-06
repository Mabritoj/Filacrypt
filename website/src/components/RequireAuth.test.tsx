import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

vi.mock('aws-amplify/auth', () => ({
  fetchAuthSession: vi.fn(),
}));

import { fetchAuthSession } from 'aws-amplify/auth';
import { RequireAuth } from './RequireAuth';

const mockFetchAuthSession = vi.mocked(fetchAuthSession);

function renderAtProtectedRoute() {
  return render(
    <MemoryRouter initialEntries={['/setup']}>
      <Routes>
        <Route
          path="/setup"
          element={
            <RequireAuth>
              <div>Protected content</div>
            </RequireAuth>
          }
        />
        <Route path="/login" element={<div>Login page</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => vi.clearAllMocks());

describe('RequireAuth', () => {
  it('renders children when a session exists', async () => {
    mockFetchAuthSession.mockResolvedValue({ tokens: { idToken: {} } } as never);

    renderAtProtectedRoute();

    expect(await screen.findByText('Protected content')).toBeInTheDocument();
  });

  it('navigates to /login when there is no session', async () => {
    mockFetchAuthSession.mockResolvedValue({ tokens: undefined } as never);

    renderAtProtectedRoute();

    expect(await screen.findByText('Login page')).toBeInTheDocument();
    expect(screen.queryByText('Protected content')).not.toBeInTheDocument();
  });

  it('renders an error state when fetchAuthSession rejects', async () => {
    mockFetchAuthSession.mockRejectedValue(new Error('network error'));
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    renderAtProtectedRoute();

    expect(
      await screen.findByText('Something went wrong signing you in. Please refresh the page.'),
    ).toBeInTheDocument();
    expect(screen.queryByText('Protected content')).not.toBeInTheDocument();

    consoleErrorSpy.mockRestore();
  });
});
