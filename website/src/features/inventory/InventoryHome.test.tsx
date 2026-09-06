import { describe, expect, it, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { http, HttpResponse, delay } from 'msw';
import { server } from '../../test/msw/server';
import { renderWithProviders } from '../../test/helpers';
import { InventoryHome } from './InventoryHome';
import { mockUser } from '../../api/mock/user';
import { mockWorkspace } from '../../api/mock/workspace';
import { mockSpools } from '../../api/mock/spools';

describe('InventoryHome', () => {
  beforeEach(() => {
    server.use(
      http.get(`${import.meta.env.VITE_API_URL}/me`, () =>
        HttpResponse.json({ user: mockUser, workspaceIds: ['ws-1'] }),
      ),
      http.get(`${import.meta.env.VITE_API_URL}/workspaces/ws-1`, () =>
        HttpResponse.json({ workspace: mockWorkspace }),
      ),
      http.get(`${import.meta.env.VITE_API_URL}/workspaces/ws-1/spools`, () =>
        HttpResponse.json({ spools: mockSpools }),
      ),
    );
  });

  it('renders the loaded inventory with computed stats and all mock spools', async () => {
    renderWithProviders(<InventoryHome />);

    expect(await screen.findByRole('heading', { name: 'Inventory' })).toBeInTheDocument();

    expect(screen.getByText('Galaxy Black')).toBeInTheDocument();
    expect(screen.getByText('Signal Orange')).toBeInTheDocument();
    expect(screen.getByText('Sakura Pink')).toBeInTheDocument();

    // (720 + 310 + 880) g = 1910 g, default weight unit is grams
    expect(screen.getByText('1910')).toBeInTheDocument();
    // 3 distinct brands: Prusament, Bambu Lab, Polymaker
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it("shows the filament remaining stat in the user's preferred weight unit", async () => {
    server.use(
      http.get(`${import.meta.env.VITE_API_URL}/me`, () =>
        HttpResponse.json({
          user: { ...mockUser, preferences: { ...mockUser.preferences, weightUnit: 'kg' } },
          workspaceIds: ['ws-1'],
        }),
      ),
    );
    renderWithProviders(<InventoryHome />);
    await screen.findByRole('heading', { name: 'Inventory' });

    // 1910 g = 1.91 kg
    expect(screen.getByText('1.91')).toBeInTheDocument();
    expect(screen.getByText('kg')).toBeInTheDocument();
  });

  it('filters the grid by search query', async () => {
    renderWithProviders(<InventoryHome />);
    await screen.findByRole('heading', { name: 'Inventory' });

    fireEvent.change(screen.getByRole('textbox', { name: 'Search spools' }), {
      target: { value: 'bambu' },
    });

    expect(screen.getByText('Signal Orange')).toBeInTheDocument();
    expect(screen.queryByText('Galaxy Black')).not.toBeInTheDocument();
    expect(screen.queryByText('Sakura Pink')).not.toBeInTheDocument();
  });

  it('opens the filter panel and filters by material type', async () => {
    renderWithProviders(<InventoryHome />);
    await screen.findByRole('heading', { name: 'Inventory' });

    fireEvent.click(screen.getByRole('button', { name: /filters/i }));
    const petgChip = screen.getByRole('button', { name: 'PETG' });
    expect(petgChip).toHaveAttribute('aria-pressed', 'false');

    fireEvent.click(petgChip);
    expect(petgChip).toHaveAttribute('aria-pressed', 'true');

    expect(screen.getByText('Signal Orange')).toBeInTheDocument();
    expect(screen.queryByText('Galaxy Black')).not.toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Showing 1–1 of 1')).toBeInTheDocument();
    });
  });

  it('closes the filter panel on outside click', async () => {
    renderWithProviders(<InventoryHome />);
    await screen.findByRole('heading', { name: 'Inventory' });

    fireEvent.click(screen.getByRole('button', { name: /filters/i }));
    expect(screen.getByText('Material type')).toBeInTheDocument();

    fireEvent.mouseDown(screen.getByRole('heading', { name: 'Inventory' }));
    expect(screen.queryByText('Material type')).not.toBeInTheDocument();
  });

  it('closes the filter panel on Escape', async () => {
    renderWithProviders(<InventoryHome />);
    await screen.findByRole('heading', { name: 'Inventory' });

    fireEvent.click(screen.getByRole('button', { name: /filters/i }));
    expect(screen.getByText('Material type')).toBeInTheDocument();

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByText('Material type')).not.toBeInTheDocument();
  });

  it('shows an empty state when no spools match', async () => {
    renderWithProviders(<InventoryHome />);
    await screen.findByRole('heading', { name: 'Inventory' });

    fireEvent.change(screen.getByRole('textbox', { name: 'Search spools' }), {
      target: { value: 'nonexistent brand' },
    });

    expect(screen.getByText('No spools match your search or filters.')).toBeInTheDocument();
  });

  it('shows an error message, not an empty inventory, when the spools fetch fails', async () => {
    server.use(
      http.get(`${import.meta.env.VITE_API_URL}/workspaces/ws-1/spools`, () =>
        HttpResponse.json(
          { error: { code: 'INTERNAL_ERROR', message: 'Could not load spools' } },
          { status: 500 },
        ),
      ),
    );
    renderWithProviders(<InventoryHome />);

    expect(await screen.findByText(/something went wrong/i)).toBeInTheDocument();
    expect(screen.queryByText('No spools match your search or filters.')).not.toBeInTheDocument();
  });

  it('shows the header while inventory data is still loading', async () => {
    server.use(
      http.get(`${import.meta.env.VITE_API_URL}/workspaces/ws-1/spools`, async () => {
        await delay('infinite');
        return HttpResponse.json({ spools: mockSpools });
      }),
    );
    renderWithProviders(<InventoryHome />);

    expect(await screen.findByText('Filacrypt')).toBeInTheDocument();
    expect(screen.getByText('Loading inventory…')).toBeInTheDocument();
  });

  it('hides the add-spool button when the caller lacks filament:create', async () => {
    server.use(
      http.get(`${import.meta.env.VITE_API_URL}/workspaces/ws-1`, () =>
        HttpResponse.json({
          workspace: {
            ...mockWorkspace,
            callerRole: 'member',
            callerFilamentPermissions: { create: false, read: true, update: false, delete: false },
          },
        }),
      ),
    );

    renderWithProviders(<InventoryHome />);

    await screen.findByRole('heading', { name: 'Inventory' });
    expect(screen.queryByRole('button', { name: /scan.*add spool/i })).not.toBeInTheDocument();
  });

  it('shows the add-spool button when a member caller has filament:create', async () => {
    server.use(
      http.get(`${import.meta.env.VITE_API_URL}/workspaces/ws-1`, () =>
        HttpResponse.json({
          workspace: {
            ...mockWorkspace,
            callerRole: 'member',
            callerFilamentPermissions: { create: true, read: true, update: false, delete: false },
          },
        }),
      ),
    );

    renderWithProviders(<InventoryHome />);

    await screen.findByRole('heading', { name: 'Inventory' });
    expect(screen.getByRole('button', { name: /scan.*add spool/i })).toBeInTheDocument();
  });
});
