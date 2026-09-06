import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { renderWithProviders } from '../../test/helpers';
import { Landing } from './Landing';

vi.mock('aws-amplify/auth', () => ({
  fetchAuthSession: vi.fn(),
}));

import { fetchAuthSession } from 'aws-amplify/auth';

const mockFetchAuthSession = vi.mocked(fetchAuthSession);

function renderAtRoot() {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/inventory" element={<div>Inventory page</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('Landing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetchAuthSession.mockResolvedValue({ tokens: undefined } as never);
  });

  it('renders without crashing', () => {
    renderWithProviders(<Landing />);
    expect(screen.getByText('Filacrypt')).toBeInTheDocument();
  });

  it('links the primary CTAs to the inventory route', () => {
    renderWithProviders(<Landing />);
    expect(screen.getByRole('link', { name: 'Start your inventory' })).toHaveAttribute(
      'href',
      '/inventory',
    );
  });

  it('stays on the marketing page when there is no session', async () => {
    renderAtRoot();

    await waitFor(() => expect(mockFetchAuthSession).toHaveBeenCalledTimes(1));
    expect(screen.getByText('Filacrypt')).toBeInTheDocument();
    expect(screen.queryByText('Inventory page')).not.toBeInTheDocument();
  });

  it('redirects to /inventory automatically when a session already exists', async () => {
    mockFetchAuthSession.mockResolvedValue({ tokens: { idToken: {} } } as never);

    renderAtRoot();

    expect(await screen.findByText('Inventory page')).toBeInTheDocument();
  });
});
