import { describe, expect, it, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { render } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse, delay } from 'msw';
import { server } from '../../test/msw/server';
import { FilamentDetail } from './FilamentDetail';
import { mockUser } from '../../api/mock/user';
import { mockWorkspace } from '../../api/mock/workspace';
import { mockSpools } from '../../api/mock/spools';
import { mockUsageEvents } from '../../api/mock/usageEvents';

beforeEach(() => {
  server.use(
    http.get(`${import.meta.env.VITE_API_URL}/me`, () =>
      HttpResponse.json({ user: mockUser, workspaceIds: ['ws-1'] }),
    ),
    http.get(`${import.meta.env.VITE_API_URL}/workspaces/ws-1`, () =>
      HttpResponse.json({ workspace: mockWorkspace }),
    ),
    http.get(`${import.meta.env.VITE_API_URL}/workspaces/ws-1/spools/:id`, ({ params }) => {
      const spool = mockSpools.find((s) => s.id === params.id);
      if (!spool) {
        return HttpResponse.json(
          { error: { code: 'NOT_FOUND', message: 'Spool not found' } },
          { status: 404 },
        );
      }
      return HttpResponse.json({ spool });
    }),
    http.get(`${import.meta.env.VITE_API_URL}/workspaces/ws-1/spools/:id/usage`, ({ params }) =>
      HttpResponse.json({
        usageEvents: mockUsageEvents.filter((event) => event.spoolId === params.id),
      }),
    ),
    http.get(`${import.meta.env.VITE_API_URL}/workspaces/ws-1/spools`, () =>
      HttpResponse.json({ spools: mockSpools }),
    ),
    http.patch(
      `${import.meta.env.VITE_API_URL}/workspaces/ws-1/spools/:id`,
      async ({ params, request }) => {
        const body = (await request.json()) as Record<string, unknown>;
        const spool = mockSpools.find((s) => s.id === params.id);
        lastPatchBody = body;
        return HttpResponse.json({ spool: { ...spool, ...body } });
      },
    ),
    http.delete(`${import.meta.env.VITE_API_URL}/workspaces/ws-1/spools/:id`, () => {
      deleteCalled = true;
      return new HttpResponse(null, { status: 204 });
    }),
  );
});

let lastPatchBody: Record<string, unknown> | null = null;
let deleteCalled = false;

beforeEach(() => {
  lastPatchBody = null;
  deleteCalled = false;
});

function renderAtSpool(id: string) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[`/inventory/${id}`]}>
        <Routes>
          <Route path="/inventory/:id" element={<FilamentDetail />} />
          <Route path="/inventory" element={<div>Inventory Home</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

function openOptionsMenu() {
  fireEvent.click(screen.getByRole('button', { name: 'Spool options' }));
}

describe('FilamentDetail', () => {
  it('renders the spool identity, mini stats, and NFC tag status', async () => {
    renderAtSpool('spool-galaxy-black');

    expect(await screen.findByRole('heading', { name: 'Galaxy Black' })).toBeInTheDocument();
    expect(screen.getAllByText('Prusament').length).toBeGreaterThan(0);
    expect(screen.getByText('1000 g')).toBeInTheDocument();
    expect(screen.getByText('Healthy')).toBeInTheDocument();
    expect(screen.getByText('E0:04:01:50:8A:3F:2C:11')).toBeInTheDocument();
  });

  it('shows Reorder spool in the options menu and closes the menu when clicked', async () => {
    renderAtSpool('spool-galaxy-black');
    await screen.findByRole('heading', { name: 'Galaxy Black' });

    openOptionsMenu();
    fireEvent.click(screen.getByRole('menuitem', { name: 'Reorder spool' }));

    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('converts weight, temperature, length, and currency per the user preferences', async () => {
    server.use(
      http.get(`${import.meta.env.VITE_API_URL}/me`, () =>
        HttpResponse.json({
          user: {
            ...mockUser,
            preferences: {
              ...mockUser.preferences,
              weightUnit: 'kg',
              temperatureUnit: 'F',
              lengthUnit: 'ft',
              currency: 'EUR',
            },
          },
          workspaceIds: ['ws-1'],
        }),
      ),
    );
    renderAtSpool('spool-galaxy-black');
    await screen.findByRole('heading', { name: 'Galaxy Black' });

    expect(screen.getByText('1.00 kg')).toBeInTheDocument();
    expect(screen.getAllByText('0.72 kg').length).toBeGreaterThan(0);
    expect(screen.getByText('0.20 kg')).toBeInTheDocument();
    expect(screen.getByText('401 °F–437 °F')).toBeInTheDocument();
    expect(screen.getByText('140 °F')).toBeInTheDocument();
    expect(screen.getByText('131 °F')).toBeInTheDocument();
    expect(screen.getByText('1086 ft')).toBeInTheDocument();
    expect(screen.getAllByText('€29.99').length).toBeGreaterThan(0);
    expect(screen.getByText('€21.59')).toBeInTheDocument();

    // Diameter is a spec number, not a converted "length" — always literal mm.
    expect(screen.getAllByText('1.75 mm').length).toBeGreaterThan(0);
  });

  it('renders the usage history for the spool', async () => {
    renderAtSpool('spool-galaxy-black');
    await screen.findByRole('heading', { name: 'Galaxy Black' });

    expect(screen.getByText('Benchy calibration ×4')).toBeInTheDocument();
    expect(screen.getByText('280 g used across 4 prints')).toBeInTheDocument();
  });

  it('has no separate Adjust button for remaining weight', async () => {
    renderAtSpool('spool-galaxy-black');
    await screen.findByRole('heading', { name: 'Galaxy Black' });

    expect(screen.getByText('72%')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Adjust' })).not.toBeInTheDocument();
  });

  it('does not show the remaining weight slider outside edit mode', async () => {
    renderAtSpool('spool-galaxy-black');
    await screen.findByRole('heading', { name: 'Galaxy Black' });

    expect(screen.queryByRole('slider', { name: 'Remaining weight' })).not.toBeInTheDocument();
  });

  it('edits and saves the remaining weight via a slider shown in edit mode', async () => {
    renderAtSpool('spool-galaxy-black');
    await screen.findByRole('heading', { name: 'Galaxy Black' });

    openOptionsMenu();
    fireEvent.click(screen.getByRole('menuitem', { name: 'Edit spool' }));

    const slider = screen.getByRole('slider', { name: 'Remaining weight' });
    expect(slider).toHaveValue('720');
    fireEvent.change(slider, { target: { value: '500' } });

    await waitFor(() => expect(screen.getByText('50%')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Spool options' })).toBeInTheDocument(),
    );
    expect(lastPatchBody).toEqual({ remainingWeightG: 500 });
    expect(screen.getByText('50%')).toBeInTheDocument();
  });

  it('shows a not-found state for an unknown spool id', async () => {
    renderAtSpool('does-not-exist');
    expect(await screen.findByText('Spool not found.')).toBeInTheDocument();
  });

  it('turns fields into inputs and swaps the header actions when Edit spool is chosen', async () => {
    renderAtSpool('spool-galaxy-black');
    await screen.findByRole('heading', { name: 'Galaxy Black' });

    openOptionsMenu();
    fireEvent.click(screen.getByRole('menuitem', { name: 'Edit spool' }));

    expect(screen.getByLabelText('Brand')).toHaveValue('Prusament');
    expect(screen.getByLabelText('Storage location')).toHaveValue('Dry cabinet · Bin B3');
    expect(screen.getByLabelText('Color')).toHaveValue('#26272f');
    expect(screen.getByLabelText('Color hex code')).toHaveValue('#26272f');
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Spool options' })).not.toBeInTheDocument();
  });

  it('does not allow editing net weight, even in edit mode', async () => {
    renderAtSpool('spool-galaxy-black');
    await screen.findByRole('heading', { name: 'Galaxy Black' });

    openOptionsMenu();
    fireEvent.click(screen.getByRole('menuitem', { name: 'Edit spool' }));

    expect(screen.queryByLabelText('Net weight (g)')).not.toBeInTheDocument();
    expect(screen.getAllByText('1000 g').length).toBeGreaterThan(0);
  });

  it('updates the color via the hex text field next to the swatch', async () => {
    renderAtSpool('spool-galaxy-black');
    await screen.findByRole('heading', { name: 'Galaxy Black' });

    openOptionsMenu();
    fireEvent.click(screen.getByRole('menuitem', { name: 'Edit spool' }));

    fireEvent.change(screen.getByLabelText('Color hex code'), { target: { value: '#ff0000' } });
    expect(screen.getByLabelText('Color')).toHaveValue('#ff0000');

    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Spool options' })).toBeInTheDocument(),
    );
    expect(lastPatchBody).toEqual({ colorHex: '#ff0000' });
  });

  it('saves only the changed fields and shows the updated values', async () => {
    renderAtSpool('spool-galaxy-black');
    await screen.findByRole('heading', { name: 'Galaxy Black' });

    openOptionsMenu();
    fireEvent.click(screen.getByRole('menuitem', { name: 'Edit spool' }));

    fireEvent.change(screen.getByLabelText('Brand'), { target: { value: 'New Brand' } });
    fireEvent.change(screen.getByLabelText('Storage location'), { target: { value: 'Shelf 2' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Spool options' })).toBeInTheDocument(),
    );
    expect(lastPatchBody).toEqual({ brand: 'New Brand', storageLocation: 'Shelf 2' });
    expect(screen.getAllByText('New Brand').length).toBeGreaterThan(0);
  });

  it('discards edits without saving when Cancel is clicked', async () => {
    renderAtSpool('spool-galaxy-black');
    await screen.findByRole('heading', { name: 'Galaxy Black' });

    openOptionsMenu();
    fireEvent.click(screen.getByRole('menuitem', { name: 'Edit spool' }));
    fireEvent.change(screen.getByLabelText('Brand'), { target: { value: 'Discarded Brand' } });
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(lastPatchBody).toBeNull();
    expect(screen.getAllByText('Prusament').length).toBeGreaterThan(0);
    expect(screen.queryByText('Discarded Brand')).not.toBeInTheDocument();
  });

  it('shows a delete confirmation dialog that is not dismissed by clicking outside', async () => {
    renderAtSpool('spool-galaxy-black');
    await screen.findByRole('heading', { name: 'Galaxy Black' });

    openOptionsMenu();
    fireEvent.click(screen.getByRole('menuitem', { name: 'Delete spool' }));

    expect(screen.getByRole('heading', { name: 'Delete this spool?' })).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('modal-backdrop'));
    expect(screen.getByRole('heading', { name: 'Delete this spool?' })).toBeInTheDocument();
  });

  it('Cancel in the delete dialog keeps the spool', async () => {
    renderAtSpool('spool-galaxy-black');
    await screen.findByRole('heading', { name: 'Galaxy Black' });

    openOptionsMenu();
    fireEvent.click(screen.getByRole('menuitem', { name: 'Delete spool' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(screen.queryByRole('heading', { name: 'Delete this spool?' })).not.toBeInTheDocument();
    expect(deleteCalled).toBe(false);
    expect(screen.getByRole('heading', { name: 'Galaxy Black' })).toBeInTheDocument();
  });

  it('confirming delete calls the delete endpoint and navigates to inventory', async () => {
    renderAtSpool('spool-galaxy-black');
    await screen.findByRole('heading', { name: 'Galaxy Black' });

    openOptionsMenu();
    fireEvent.click(screen.getByRole('menuitem', { name: 'Delete spool' }));
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));

    expect(await screen.findByText('Inventory Home')).toBeInTheDocument();
    expect(deleteCalled).toBe(true);
  });

  it('shows an error message if saving an edit fails, without crashing', async () => {
    renderAtSpool('spool-galaxy-black');
    await screen.findByRole('heading', { name: 'Galaxy Black' });
    server.use(
      http.patch(`${import.meta.env.VITE_API_URL}/workspaces/ws-1/spools/spool-galaxy-black`, () =>
        HttpResponse.json(
          { error: { code: 'INTERNAL_ERROR', message: 'Could not save changes' } },
          { status: 500 },
        ),
      ),
    );

    openOptionsMenu();
    fireEvent.click(screen.getByRole('menuitem', { name: 'Edit spool' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByText('Could not save changes')).toBeInTheDocument();
  });

  it('shows an error message if deleting the spool fails', async () => {
    renderAtSpool('spool-galaxy-black');
    await screen.findByRole('heading', { name: 'Galaxy Black' });
    server.use(
      http.delete(`${import.meta.env.VITE_API_URL}/workspaces/ws-1/spools/spool-galaxy-black`, () =>
        HttpResponse.json(
          { error: { code: 'INTERNAL_ERROR', message: 'Could not delete spool' } },
          { status: 500 },
        ),
      ),
    );

    openOptionsMenu();
    fireEvent.click(screen.getByRole('menuitem', { name: 'Delete spool' }));
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));

    expect(await screen.findByText('Could not delete spool')).toBeInTheDocument();
  });

  it('shows the header while spool data is still loading', async () => {
    server.use(
      http.get(`${import.meta.env.VITE_API_URL}/workspaces/ws-1/spools/:id`, async () => {
        await delay('infinite');
        return HttpResponse.json({ spool: mockSpools[0] });
      }),
    );
    renderAtSpool('spool-galaxy-black');

    expect(await screen.findByText('Filacrypt')).toBeInTheDocument();
    expect(screen.getByText('Loading spool…')).toBeInTheDocument();
  });

  it('hides the Edit spool menu item when the caller lacks filament:update', async () => {
    server.use(
      http.get(`${import.meta.env.VITE_API_URL}/workspaces/ws-1`, () =>
        HttpResponse.json({
          workspace: {
            ...mockWorkspace,
            callerRole: 'member',
            callerFilamentPermissions: { create: true, read: true, update: false, delete: true },
          },
        }),
      ),
    );
    renderAtSpool('spool-galaxy-black');
    await screen.findByRole('heading', { name: 'Galaxy Black' });

    openOptionsMenu();
    expect(screen.queryByRole('menuitem', { name: 'Edit spool' })).not.toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Delete spool' })).toBeInTheDocument();
  });

  it('hides the Delete spool menu item when the caller lacks filament:delete', async () => {
    server.use(
      http.get(`${import.meta.env.VITE_API_URL}/workspaces/ws-1`, () =>
        HttpResponse.json({
          workspace: {
            ...mockWorkspace,
            callerRole: 'member',
            callerFilamentPermissions: { create: true, read: true, update: true, delete: false },
          },
        }),
      ),
    );
    renderAtSpool('spool-galaxy-black');
    await screen.findByRole('heading', { name: 'Galaxy Black' });

    openOptionsMenu();
    expect(screen.getByRole('menuitem', { name: 'Edit spool' })).toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: 'Delete spool' })).not.toBeInTheDocument();
  });
});
