import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { server } from '../test/msw/server';
import { renderWithProviders } from '../test/helpers';
import { ProfileMenu } from './ProfileMenu';
import { useThemeStore } from '../stores/themeStore';
import { mockUser } from '../api/mock/user';
import { mockWorkspace } from '../api/mock/workspace';

vi.mock('aws-amplify/auth', () => ({
  signOut: vi.fn(),
  fetchAuthSession: vi.fn().mockResolvedValue({ tokens: { idToken: { toString: () => 'token' } } }),
}));

import { signOut } from 'aws-amplify/auth';

const mockSignOut = vi.mocked(signOut);

describe('ProfileMenu', () => {
  beforeEach(() => {
    useThemeStore.setState({ theme: 'dark' });
    mockSignOut.mockReset();
    mockSignOut.mockResolvedValue(undefined as never);
    server.use(
      http.get(`${import.meta.env.VITE_API_URL}/me`, () =>
        HttpResponse.json({ user: mockUser, workspaceIds: ['workspace-1'] }),
      ),
      http.get(`${import.meta.env.VITE_API_URL}/workspaces/workspace-1`, () =>
        HttpResponse.json({ workspace: mockWorkspace }),
      ),
    );
  });

  it('renders the avatar and stays closed by default', () => {
    renderWithProviders(<ProfileMenu />);
    expect(screen.getByRole('button', { name: 'Open profile menu' })).toBeInTheDocument();
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('opens the menu on click and shows the name/email', () => {
    renderWithProviders(<ProfileMenu name="Morgan Reyes" email="morgan@filacrypt.com" />);
    fireEvent.click(screen.getByRole('button', { name: 'Open profile menu' }));

    const menu = screen.getByRole('menu');
    expect(within(menu).getByText('Morgan Reyes')).toBeInTheDocument();
    expect(within(menu).getByText('morgan@filacrypt.com')).toBeInTheDocument();
  });

  it('links "Add Spool" to /scan and closes the menu on click', () => {
    renderWithProviders(<ProfileMenu />);
    fireEvent.click(screen.getByRole('button', { name: 'Open profile menu' }));

    const addSpoolLink = screen.getByRole('menuitem', { name: 'Add Spool' });
    expect(addSpoolLink).toHaveAttribute('href', '/scan');

    fireEvent.click(addSpoolLink);
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('links the settings gear next to the email to /account and closes the menu on click', () => {
    renderWithProviders(<ProfileMenu />);
    fireEvent.click(screen.getByRole('button', { name: 'Open profile menu' }));

    const settingsLink = screen.getByRole('link', { name: 'Account settings' });
    expect(settingsLink).toHaveAttribute('href', '/account');

    fireEvent.click(settingsLink);
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('no longer lists Account settings as its own menu item', () => {
    renderWithProviders(<ProfileMenu />);
    fireEvent.click(screen.getByRole('button', { name: 'Open profile menu' }));

    expect(screen.queryByRole('menuitem', { name: 'Account settings' })).not.toBeInTheDocument();
  });

  it('toggles the theme store when Dark mode is clicked', () => {
    renderWithProviders(<ProfileMenu />);
    fireEvent.click(screen.getByRole('button', { name: 'Open profile menu' }));

    expect(useThemeStore.getState().theme).toBe('dark');
    fireEvent.click(screen.getByRole('menuitemcheckbox', { name: /dark mode/i }));
    expect(useThemeStore.getState().theme).toBe('light');
  });

  it('persists the new theme via PATCH /me when Dark mode is clicked', async () => {
    let requestBody: unknown;
    server.use(
      http.patch(`${import.meta.env.VITE_API_URL}/me`, async ({ request }) => {
        requestBody = await request.json();
        return HttpResponse.json({ user: { preferences: { theme: 'light' } } });
      }),
    );
    renderWithProviders(<ProfileMenu />);
    fireEvent.click(screen.getByRole('button', { name: 'Open profile menu' }));

    fireEvent.click(screen.getByRole('menuitemcheckbox', { name: /dark mode/i }));

    await waitFor(() => expect(requestBody).toEqual({ preferences: { theme: 'light' } }));
  });

  it('closes the menu when Escape is pressed', () => {
    renderWithProviders(<ProfileMenu />);
    fireEvent.click(screen.getByRole('button', { name: 'Open profile menu' }));
    expect(screen.getByRole('menu')).toBeInTheDocument();

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('calls signOut and closes the menu when Sign out is clicked', () => {
    renderWithProviders(<ProfileMenu />);
    fireEvent.click(screen.getByRole('button', { name: 'Open profile menu' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Sign out' }));

    expect(mockSignOut).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('navigates to the landing page after signing out', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/inventory']}>
          <Routes>
            <Route path="/inventory" element={<ProfileMenu />} />
            <Route path="/" element={<div>Landing Page</div>} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Open profile menu' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Sign out' }));

    expect(await screen.findByText('Landing Page')).toBeInTheDocument();
  });

  it('does not throw when signOut rejects', async () => {
    mockSignOut.mockRejectedValue(new Error('network error'));
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    renderWithProviders(<ProfileMenu />);
    fireEvent.click(screen.getByRole('button', { name: 'Open profile menu' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Sign out' }));

    await waitFor(() => expect(consoleErrorSpy).toHaveBeenCalled());

    consoleErrorSpy.mockRestore();
  });

  it('shows the current workspace name with an "(owner)" suffix when the user owns it', async () => {
    renderWithProviders(<ProfileMenu />);
    fireEvent.click(screen.getByRole('button', { name: 'Open profile menu' }));
    const menu = screen.getByRole('menu');

    const workspaceName = await within(menu).findByTestId('workspace-name');
    expect(workspaceName).toHaveTextContent('My Workspace (owner)');
  });

  it('omits the "(owner)" suffix when the user does not own the workspace', async () => {
    server.use(
      http.get(`${import.meta.env.VITE_API_URL}/workspaces/workspace-1`, () =>
        HttpResponse.json({ workspace: { ...mockWorkspace, ownerId: 'someone-else' } }),
      ),
    );
    renderWithProviders(<ProfileMenu />);
    fireEvent.click(screen.getByRole('button', { name: 'Open profile menu' }));
    const menu = screen.getByRole('menu');

    const workspaceName = await within(menu).findByTestId('workspace-name');
    expect(workspaceName).toHaveTextContent('My Workspace');
    expect(workspaceName).not.toHaveTextContent('owner');
  });

  it('does nothing when the switch-workspace button is clicked', async () => {
    renderWithProviders(<ProfileMenu />);
    fireEvent.click(screen.getByRole('button', { name: 'Open profile menu' }));
    const menu = screen.getByRole('menu');

    const switchButton = await within(menu).findByRole('button', { name: 'Switch workspace' });
    fireEvent.click(switchButton);

    expect(screen.getByRole('menu')).toBeInTheDocument();
    expect(mockSignOut).not.toHaveBeenCalled();
  });
});
