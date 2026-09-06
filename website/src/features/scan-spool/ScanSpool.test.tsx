import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse, delay } from 'msw';
import { server } from '../../test/msw/server';
import { FakeNDEFReader, installFakeNdefReader, makeMimeRecord } from '../../test/fakeNdefReader';
import { ScanSpool } from './ScanSpool';
import { mockSpools } from '../../api/mock/spools';
import { mockUser } from '../../api/mock/user';
import { mockWorkspace } from '../../api/mock/workspace';
import {
  REAL_PRUSAMENT_PC_CF_PAYLOAD_HEX,
  REAL_PRUSAMENT_SERIAL_NUMBER,
  hexToBytes,
} from '../../utils/openPrintTag/fixtures';

let lastPostBody: Record<string, unknown> | null = null;

function renderScanSpoolRaw(entryMode: 'nfc' | 'manual' = 'nfc') {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  queryClient.setQueryData(['user'], {
    ...mockUser,
    workspaceIds: ['ws-1'],
    preferences: { ...mockUser.preferences, defaultEntryMode: entryMode },
  });
  const utils = render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/scan']}>
        <Routes>
          <Route path="/scan" element={<ScanSpool />} />
          <Route path="/inventory" element={<div>Inventory Page</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
  return { queryClient, ...utils };
}

/** Fires a real captured OpenPrintTag read at the currently armed reader. */
function presentRealTag() {
  act(() => {
    FakeNDEFReader.last.onreading?.({
      serialNumber: REAL_PRUSAMENT_SERIAL_NUMBER,
      message: {
        records: [
          { recordType: 'url', data: new DataView(new ArrayBuffer(4)) },
          makeMimeRecord(
            'application/vnd.openprinttag',
            hexToBytes(REAL_PRUSAMENT_PC_CF_PAYLOAD_HEX),
          ),
        ],
      },
    });
  });
}

describe('ScanSpool', () => {
  beforeEach(() => {
    lastPostBody = null;
    server.use(
      http.get(`${import.meta.env.VITE_API_URL}/me`, () =>
        HttpResponse.json({ user: mockUser, workspaceIds: ['ws-1'] }),
      ),
      http.get(`${import.meta.env.VITE_API_URL}/workspaces/ws-1`, () =>
        HttpResponse.json({ workspace: mockWorkspace }),
      ),
      // useAddSpool's onSuccess calls ensureQueryData for the spools list, so a
      // successful create refetches it unless the cache is already seeded.
      http.get(`${import.meta.env.VITE_API_URL}/workspaces/ws-1/spools`, () =>
        HttpResponse.json({ spools: mockSpools }),
      ),
      http.post(`${import.meta.env.VITE_API_URL}/workspaces/ws-1/spools`, async ({ request }) => {
        const body = (await request.json()) as Record<string, unknown>;
        lastPostBody = body;
        return HttpResponse.json(
          {
            spool: {
              ...body,
              id: 'spool-new',
              createdAt: '2026-07-10T00:00:00.000Z',
              updatedAt: '2026-07-10T00:00:00.000Z',
            },
          },
          { status: 201 },
        );
      }),
    );
  });

  // jsdom has no NDEFReader, so this block is the iOS / desktop experience.
  describe('without Web NFC support', () => {
    it('falls back to manual entry silently, with no reader screen or error', async () => {
      renderScanSpoolRaw('nfc');

      expect(await screen.findByText('Manual entry')).toBeInTheDocument();
      expect(screen.queryByRole('heading', { name: 'Scan a spool' })).not.toBeInTheDocument();
      expect(screen.queryByText('Enter manually instead')).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Switch to NFC' })).not.toBeInTheDocument();
    });

    it('exits to Inventory on cancel, since there is no reader to fall back to', async () => {
      renderScanSpoolRaw('nfc');
      await screen.findByText('Manual entry');

      fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

      expect(await screen.findByText('Inventory Page')).toBeInTheDocument();
    });

    it('adds a manually entered spool', async () => {
      const { queryClient } = renderScanSpoolRaw('nfc');
      await screen.findByText('Manual entry');
      queryClient.setQueryData(['spools', 'ws-1'], mockSpools);

      fireEvent.change(screen.getByLabelText('Brand'), { target: { value: 'eSun' } });
      fireEvent.change(screen.getByLabelText('Spool name'), { target: { value: 'Forest Green' } });
      fireEvent.change(screen.getByLabelText('Color hex code'), { target: { value: '#2f5d3a' } });
      fireEvent.click(screen.getByRole('button', { name: 'Add to inventory' }));

      expect(
        await screen.findByRole('heading', { name: 'Added to inventory' }),
      ).toBeInTheDocument();
      const cached = queryClient.getQueryData<typeof mockSpools>(['spools', 'ws-1']);
      expect(cached?.at(-1)?.brand).toBe('eSun');
    });

    it('leaves tag status unset for a manually entered spool', async () => {
      renderScanSpoolRaw('nfc');
      await screen.findByText('Manual entry');

      fireEvent.change(screen.getByLabelText('Brand'), { target: { value: 'eSun' } });
      fireEvent.change(screen.getByLabelText('Spool name'), { target: { value: 'Forest Green' } });
      fireEvent.click(screen.getByRole('button', { name: 'Add to inventory' }));

      await screen.findByRole('heading', { name: 'Added to inventory' });
      expect(lastPostBody?.tag).toBeUndefined();
    });

    it('shows an error message if adding the spool fails, without crashing', async () => {
      renderScanSpoolRaw('nfc');
      await screen.findByText('Manual entry');
      server.use(
        http.post(`${import.meta.env.VITE_API_URL}/workspaces/ws-1/spools`, () =>
          HttpResponse.json(
            { error: { code: 'INTERNAL_ERROR', message: 'Could not add spool' } },
            { status: 500 },
          ),
        ),
      );

      fireEvent.change(screen.getByLabelText('Brand'), { target: { value: 'eSun' } });
      fireEvent.change(screen.getByLabelText('Spool name'), { target: { value: 'Forest Green' } });
      fireEvent.click(screen.getByRole('button', { name: 'Add to inventory' }));

      expect(await screen.findByText('Could not add spool')).toBeInTheDocument();
    });

    it('pre-fills manual entry from workspace defaults', async () => {
      server.use(
        http.get(`${import.meta.env.VITE_API_URL}/workspaces/ws-1`, () =>
          HttpResponse.json({
            workspace: { ...mockWorkspace, defaultDiameterMm: 2.85, defaultEmptySpoolWeightG: 240 },
          }),
        ),
      );
      renderScanSpoolRaw('nfc');
      await screen.findByText('Manual entry');

      expect(screen.getByLabelText('Diameter (mm)')).toHaveValue(2.85);
      expect(screen.getByLabelText('Empty spool weight (g)')).toHaveValue(240);
    });

    it('renders "Add Spool" in the breadcrumb', async () => {
      renderScanSpoolRaw('nfc');
      await screen.findByText('Manual entry');
      expect(screen.getByText('Add Spool')).toBeInTheDocument();
    });

    it('shows the header while workspace data is still loading', async () => {
      server.use(
        http.get(`${import.meta.env.VITE_API_URL}/workspaces/ws-1`, async () => {
          await delay('infinite');
          return HttpResponse.json({ workspace: mockWorkspace });
        }),
      );
      renderScanSpoolRaw('nfc');

      expect(await screen.findByText('Filacrypt')).toBeInTheDocument();
      expect(screen.getByText('Add Spool')).toBeInTheDocument();
      expect(screen.getByText('Loading…')).toBeInTheDocument();
    });
  });

  describe('with Web NFC support', () => {
    beforeEach(() => {
      installFakeNdefReader();
    });

    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it('starts on the reader screen', async () => {
      renderScanSpoolRaw('nfc');
      expect(await screen.findByRole('heading', { name: 'Scan a spool' })).toBeInTheDocument();
    });

    it('arms the reader automatically, with no tap needed', async () => {
      renderScanSpoolRaw('nfc');
      await screen.findByRole('heading', { name: 'Scan a spool' });

      // The whole point: opening the page is enough to start listening.
      expect(FakeNDEFReader.instances).toHaveLength(1);
      expect(screen.getByText('Listening for a tag')).toBeInTheDocument();
    });

    it('goes straight from the reader card to detected when a tag is presented', async () => {
      renderScanSpoolRaw('nfc');
      await screen.findByRole('heading', { name: 'Scan a spool' });

      presentRealTag();

      expect(await screen.findByText('Tag detected — new spool')).toBeInTheDocument();
      expect(screen.getByDisplayValue('PC Blend Carbon Fiber Black')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Prusament')).toBeInTheDocument();
    });

    it('falls back to a tap prompt, not an error, when auto-start is refused', async () => {
      // Chrome rejects scan() without transient activation, which is expected
      // rather than a real permission denial -- it must not look like one.
      FakeNDEFReader.scanImpl = () => Promise.reject(new DOMException('no', 'NotAllowedError'));
      renderScanSpoolRaw('nfc');

      await screen.findByRole('heading', { name: 'Scan a spool' });
      await act(async () => {
        await Promise.resolve();
      });

      expect(screen.getByText('Tap the reader to start')).toBeInTheDocument();
      expect(screen.queryByText(/needs permission to use NFC/)).not.toBeInTheDocument();
    });

    it('shows the normalised UID, not the byte-reversed one Chrome reports', async () => {
      renderScanSpoolRaw('nfc');
      await screen.findByRole('heading', { name: 'Scan a spool' });
      fireEvent.click(screen.getByRole('button', { name: 'Scan a spool' }));
      presentRealTag();

      await screen.findByText('Tag detected — new spool');
      expect(screen.getByText(/E0:04:01:08:66:2F:D9:3C/)).toBeInTheDocument();
    });

    it('populates Spool.tag and the decoded extras on submit', async () => {
      renderScanSpoolRaw('nfc');
      await screen.findByRole('heading', { name: 'Scan a spool' });
      fireEvent.click(screen.getByRole('button', { name: 'Scan a spool' }));
      presentRealTag();
      await screen.findByText('Tag detected — new spool');

      fireEvent.click(screen.getByRole('button', { name: 'Add to inventory' }));
      await screen.findByRole('heading', { name: 'Added to inventory' });

      expect(lastPostBody?.tag).toMatchObject({
        uid: 'E0:04:01:08:66:2F:D9:3C',
        standard: 'NFC-V (ISO 15693)',
        healthy: true,
      });
      // Fields the review form has no input for still reach the API.
      expect(lastPostBody?.densityGCm3).toBe(1.22);
      expect(lastPostBody?.actualNetWeightG).toBe(868);
      expect(lastPostBody?.serial).toBe('bf26593917');
      // Every property the tag declared is preserved, not just the finish.
      expect(lastPostBody?.tags).toEqual(
        expect.arrayContaining(['contains_carbon_fiber', 'blend', 'abrasive', 'contains_carbon']),
      );
    });

    it('offers manual entry from the reader screen', async () => {
      renderScanSpoolRaw('nfc');
      await screen.findByRole('heading', { name: 'Scan a spool' });

      fireEvent.click(screen.getByRole('button', { name: 'Enter manually instead' }));

      expect(screen.getByText('Manual entry')).toBeInTheDocument();
      expect(screen.getByLabelText('Brand')).toHaveValue('');
    });

    it('returns to the reader from Rescan', async () => {
      renderScanSpoolRaw('nfc');
      await screen.findByRole('heading', { name: 'Scan a spool' });
      fireEvent.click(screen.getByRole('button', { name: 'Scan a spool' }));
      presentRealTag();
      await screen.findByText('Tag detected — new spool');

      fireEvent.click(screen.getByRole('button', { name: 'Rescan' }));

      expect(screen.getByRole('heading', { name: 'Scan a spool' })).toBeInTheDocument();
    });

    it('returns to the reader on cancel from a scanned review', async () => {
      renderScanSpoolRaw('nfc');
      await screen.findByRole('heading', { name: 'Scan a spool' });
      fireEvent.click(screen.getByRole('button', { name: 'Scan a spool' }));
      presentRealTag();
      await screen.findByText('Tag detected — new spool');

      fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

      expect(screen.getByRole('heading', { name: 'Scan a spool' })).toBeInTheDocument();
    });

    it('starts directly on manual entry when the preference says so, still offering NFC', async () => {
      renderScanSpoolRaw('manual');

      expect(await screen.findByText('Manual entry')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Switch to NFC' })).toBeInTheDocument();
    });

    it('gives the manual-preference user the same NFC flow as everyone else', async () => {
      // Regression: "Switch to NFC" used to skip the reader card and jump
      // straight to waiting, so the two entry points felt like different
      // features. Both must now start at the same place.
      renderScanSpoolRaw('manual');
      await screen.findByText('Manual entry');

      fireEvent.click(screen.getByRole('button', { name: 'Switch to NFC' }));
      expect(screen.getByRole('heading', { name: 'Scan a spool' })).toBeInTheDocument();
      expect(screen.getByText('Listening for a tag')).toBeInTheDocument();

      presentRealTag();
      expect(await screen.findByText('Tag detected — new spool')).toBeInTheDocument();
    });

    it('returns a manual-preference user to the reader, not manual entry, on cancel', async () => {
      renderScanSpoolRaw('manual');
      await screen.findByText('Manual entry');
      fireEvent.click(screen.getByRole('button', { name: 'Switch to NFC' }));
      fireEvent.click(screen.getByRole('button', { name: 'Scan a spool' }));
      presentRealTag();
      await screen.findByText('Tag detected — new spool');

      fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

      expect(screen.getByRole('heading', { name: 'Scan a spool' })).toBeInTheDocument();
    });

    it('reports an empty tag but stays armed for another attempt', async () => {
      renderScanSpoolRaw('nfc');
      await screen.findByRole('heading', { name: 'Scan a spool' });

      act(() => {
        FakeNDEFReader.last.onreading?.({ serialNumber: 'x', message: { records: [] } });
      });

      expect(await screen.findByText(/hasn't been written with filament data/)).toBeInTheDocument();
      // Presenting another tag should just work, with no restart needed.
      expect(screen.getByText('Listening for a tag')).toBeInTheDocument();
    });

    it('returns to the reader with a message when permission is denied', async () => {
      FakeNDEFReader.scanImpl = () => Promise.reject(new DOMException('no', 'NotAllowedError'));
      renderScanSpoolRaw('nfc');
      await screen.findByRole('heading', { name: 'Scan a spool' });

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: 'Scan a spool' }));
        await Promise.resolve();
      });

      expect(await screen.findByText(/needs permission to use NFC/)).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Scan a spool' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Enter manually instead' })).toBeInTheDocument();
    });
  });
});
