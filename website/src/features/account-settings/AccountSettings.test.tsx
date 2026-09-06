import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse, delay } from 'msw';
import { server } from '../../test/msw/server';
import { AccountSettings } from './AccountSettings';
import { mockUser } from '../../api/mock/user';
import { mockWorkspace } from '../../api/mock/workspace';
import { mockMembers } from '../../api/mock/members';
import { mockDeletionImpact } from '../../api/mock/deletionImpact';
import type { DeletionImpactWorkspace } from '../../api/user';

vi.mock('aws-amplify/auth', () => ({
  signOut: vi.fn().mockResolvedValue(undefined),
  fetchAuthSession: vi.fn().mockResolvedValue({ tokens: { idToken: { toString: () => 'token' } } }),
}));

import { signOut } from 'aws-amplify/auth';

const mockSignOut = vi.mocked(signOut);

function renderAccountSettings(deletionImpactWorkspaces: DeletionImpactWorkspace[] = []) {
  server.use(
    http.get(`${import.meta.env.VITE_API_URL}/me`, () =>
      HttpResponse.json({ user: mockUser, workspaceIds: ['ws-1'] }),
    ),
    http.get(`${import.meta.env.VITE_API_URL}/workspaces/ws-1`, () =>
      HttpResponse.json({ workspace: mockWorkspace }),
    ),
    http.patch(`${import.meta.env.VITE_API_URL}/workspaces/ws-1`, async ({ request }) => {
      const body = (await request.json()) as Record<string, unknown>;
      return HttpResponse.json({ workspace: { ...mockWorkspace, ...body } });
    }),
    http.patch(`${import.meta.env.VITE_API_URL}/me`, async ({ request }) => {
      const body = (await request.json()) as { preferences: Record<string, unknown> };
      return HttpResponse.json({
        user: { ...mockUser, preferences: { ...mockUser.preferences, ...body.preferences } },
      });
    }),
    http.get(`${import.meta.env.VITE_API_URL}/workspaces/ws-1/members`, () =>
      HttpResponse.json({ members: mockMembers }),
    ),
    http.get(`${import.meta.env.VITE_API_URL}/me/deletion-impact`, () =>
      HttpResponse.json({ workspaces: deletionImpactWorkspaces }),
    ),
  );
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return {
    queryClient,
    ...render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <AccountSettings />
        </MemoryRouter>
      </QueryClientProvider>,
    ),
  };
}

describe('AccountSettings', () => {
  beforeEach(() => {
    mockSignOut.mockClear();
  });

  it('renders read-only profile fields, preferences, and inventory defaults pre-filled from real data', async () => {
    renderAccountSettings();

    expect(await screen.findByText(mockUser.name)).toBeInTheDocument();
    expect(screen.getByText(mockUser.username)).toBeInTheDocument();
    expect(screen.getByText(mockUser.email)).toBeInTheDocument();
    expect(screen.getByText('✓ VERIFIED')).toBeInTheDocument();
    expect(screen.queryByDisplayValue(mockUser.name)).not.toBeInTheDocument();

    expect(screen.getByRole('radio', { name: 'Grams' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('radio', { name: 'Dark' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('radio', { name: 'NFC scan' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByDisplayValue(String(mockWorkspace.lowStockThresholdG))).toBeInTheDocument();
    expect(screen.getByDisplayValue(String(mockWorkspace.defaultDiameterMm))).toBeInTheDocument();
  });

  it('does not render a Security card', async () => {
    renderAccountSettings();
    await screen.findByText(mockUser.name);

    expect(screen.queryByText('Security')).not.toBeInTheDocument();
    expect(screen.queryByText('Two-factor authentication')).not.toBeInTheDocument();
  });

  it('does not render a Default printer field', async () => {
    renderAccountSettings();
    await screen.findByText(mockUser.name);

    expect(screen.queryByText('Default printer')).not.toBeInTheDocument();
  });

  it('saves edited preference and inventory-default changes together', async () => {
    const { queryClient } = renderAccountSettings();
    await screen.findByText(mockUser.name);

    fireEvent.click(screen.getByRole('radio', { name: 'Kilograms' }));
    fireEvent.click(screen.getByRole('radio', { name: 'Manual entry' }));
    fireEvent.change(screen.getByDisplayValue(String(mockWorkspace.lowStockThresholdG)), {
      target: { value: '150' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));

    await waitFor(() => expect(screen.getByRole('button', { name: 'Saved' })).toBeInTheDocument());

    expect(queryClient.getQueryData<typeof mockUser>(['user'])?.preferences.weightUnit).toBe('kg');
    expect(queryClient.getQueryData<typeof mockUser>(['user'])?.preferences.defaultEntryMode).toBe(
      'manual',
    );
    expect(
      queryClient.getQueryData<typeof mockWorkspace>(['workspace', 'ws-1'])?.lowStockThresholdG,
    ).toBe(150);
  });

  it('cancel reverts unsaved edits back to the last-saved values', async () => {
    renderAccountSettings();
    await screen.findByText(mockUser.name);

    fireEvent.click(screen.getByRole('radio', { name: 'Kilograms' }));
    expect(screen.getByRole('radio', { name: 'Kilograms' })).toHaveAttribute(
      'aria-checked',
      'true',
    );

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(screen.getByRole('radio', { name: 'Grams' })).toHaveAttribute('aria-checked', 'true');
  });

  it('shows an error message if saving preferences fails, without crashing', async () => {
    renderAccountSettings();
    await screen.findByText(mockUser.name);
    server.use(
      http.patch(`${import.meta.env.VITE_API_URL}/me`, () =>
        HttpResponse.json(
          { error: { code: 'INTERNAL_ERROR', message: 'Could not save preferences' } },
          { status: 500 },
        ),
      ),
    );

    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));

    expect(await screen.findByText('Could not save preferences')).toBeInTheDocument();
  });

  it('shows an error message if account deletion fails', async () => {
    renderAccountSettings();
    await screen.findByText(mockUser.name);

    server.use(
      http.delete(`${import.meta.env.VITE_API_URL}/me`, () =>
        HttpResponse.json(
          { error: { code: 'INTERNAL_ERROR', message: 'Could not delete account' } },
          { status: 500 },
        ),
      ),
    );

    fireEvent.click(screen.getByRole('button', { name: 'Delete account' }));
    fireEvent.change(screen.getByLabelText('Confirm email address'), {
      target: { value: mockUser.email },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));

    expect(await screen.findByText('Could not delete account')).toBeInTheDocument();
  });

  describe('Delete account', () => {
    it('keeps the Delete button disabled until the typed email matches (case-insensitively)', async () => {
      renderAccountSettings();
      await screen.findByText(mockUser.name);

      fireEvent.click(screen.getByRole('button', { name: 'Delete account' }));

      const dialog = screen.getByRole('dialog');
      const confirmInput = within(dialog).getByRole('textbox', { name: /confirm/i });
      const confirmDeleteButton = within(dialog).getByRole('button', { name: 'Delete' });

      expect(confirmDeleteButton).toBeDisabled();

      fireEvent.change(confirmInput, { target: { value: 'wrong@example.com' } });
      expect(confirmDeleteButton).toBeDisabled();

      fireEvent.change(confirmInput, { target: { value: mockUser.email.toUpperCase() } });
      expect(confirmDeleteButton).not.toBeDisabled();
    });

    it('deletes the account, signs out, and navigates home on confirm', async () => {
      let deleteCalled = false;
      server.use(
        http.delete(`${import.meta.env.VITE_API_URL}/me`, () => {
          deleteCalled = true;
          return new HttpResponse(null, { status: 204 });
        }),
      );
      renderAccountSettings();
      await screen.findByText(mockUser.name);

      fireEvent.click(screen.getByRole('button', { name: 'Delete account' }));
      const dialog = screen.getByRole('dialog');
      fireEvent.change(within(dialog).getByRole('textbox', { name: /confirm/i }), {
        target: { value: mockUser.email },
      });
      fireEvent.click(within(dialog).getByRole('button', { name: 'Delete' }));

      await waitFor(() => expect(deleteCalled).toBe(true));
      await waitFor(() => expect(mockSignOut).toHaveBeenCalledTimes(1));
    });

    it('closes the modal without deleting when Cancel is clicked', async () => {
      renderAccountSettings();
      await screen.findByText(mockUser.name);

      fireEvent.click(screen.getByRole('button', { name: 'Delete account' }));
      const dialog = screen.getByRole('dialog');
      expect(dialog).toBeInTheDocument();

      fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('deleting an account with an owned multi-member workspace shows the resolution modal first', async () => {
      renderAccountSettings(mockDeletionImpact);
      await screen.findByText(mockUser.name);

      fireEvent.click(screen.getByRole('button', { name: 'Delete account' }));

      expect(await screen.findByText(/resolve ownership/i)).toBeInTheDocument();
      expect(screen.queryByText(/type.*to confirm/i)).not.toBeInTheDocument();
    });

    it('carries the chosen workspace resolution from the impact modal through the email-confirm modal into the DELETE /me request', async () => {
      let capturedBody: unknown;
      server.use(
        http.delete(`${import.meta.env.VITE_API_URL}/me`, async ({ request }) => {
          capturedBody = await request.json();
          return new HttpResponse(null, { status: 204 });
        }),
      );
      renderAccountSettings(mockDeletionImpact);
      await screen.findByText(mockUser.name);

      // Step 1: open the deletion-impact resolution modal.
      fireEvent.click(screen.getByRole('button', { name: 'Delete account' }));
      const impactDialog = await screen.findByRole('dialog', { name: /resolve ownership/i });

      // Step 2: resolve the one listed workspace ("Grace's Garage", ws-2) as
      // "delete this workspace", then continue.
      fireEvent.click(within(impactDialog).getByRole('radio', { name: /delete this workspace/i }));
      fireEvent.click(within(impactDialog).getByRole('button', { name: /continue/i }));

      // Step 3: the resolution modal closes and the email-confirm modal opens.
      await waitFor(() =>
        expect(
          screen.queryByRole('dialog', { name: /resolve ownership/i }),
        ).not.toBeInTheDocument(),
      );
      const confirmDialog = await screen.findByRole('dialog', { name: /delete your account/i });

      // Step 4: type the confirmation email and delete.
      fireEvent.change(within(confirmDialog).getByLabelText('Confirm email address'), {
        target: { value: mockUser.email },
      });
      fireEvent.click(within(confirmDialog).getByRole('button', { name: 'Delete' }));

      await waitFor(() => expect(capturedBody).toBeDefined());
      expect(capturedBody).toEqual({
        workspaceResolutions: { 'ws-2': { action: 'delete' } },
      });
    });
  });

  it('shows the header while account data is still loading', async () => {
    server.use(
      http.get(`${import.meta.env.VITE_API_URL}/me`, () =>
        HttpResponse.json({ user: mockUser, workspaceIds: ['ws-1'] }),
      ),
      http.get(`${import.meta.env.VITE_API_URL}/workspaces/ws-1`, async () => {
        await delay('infinite');
        return HttpResponse.json({ workspace: mockWorkspace });
      }),
      http.get(`${import.meta.env.VITE_API_URL}/me/deletion-impact`, () =>
        HttpResponse.json({ workspaces: [] }),
      ),
    );
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <AccountSettings />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(await screen.findByText('Filacrypt')).toBeInTheDocument();
    expect(screen.getByText('Loading…')).toBeInTheDocument();
  });
});
