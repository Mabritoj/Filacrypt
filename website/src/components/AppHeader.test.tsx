import { describe, expect, it, beforeEach } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { server } from '../test/msw/server';
import { renderWithProviders } from '../test/helpers';
import { AppHeader } from './AppHeader';
import { mockUser } from '../api/mock/user';

describe('AppHeader', () => {
  beforeEach(() => {
    server.use(
      http.get(`${import.meta.env.VITE_API_URL}/me`, () =>
        HttpResponse.json({ user: mockUser, workspaceIds: ['ws-1'] }),
      ),
    );
  });

  it('renders the brand link and profile menu', () => {
    renderWithProviders(<AppHeader />);
    expect(screen.getByText('Filacrypt')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Filacrypt/i })).toHaveAttribute('href', '/');
    expect(screen.getByRole('button', { name: 'Open profile menu' })).toBeInTheDocument();
  });

  it('renders optional breadcrumb and actions content', () => {
    renderWithProviders(
      <AppHeader
        breadcrumb={<span>Inventory / Galaxy Black</span>}
        actions={<button>Reorder</button>}
      />,
    );
    expect(screen.getByText('Inventory / Galaxy Black')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reorder' })).toBeInTheDocument();
  });

  it('shows the real signed-in user in the profile menu once loaded', async () => {
    renderWithProviders(<AppHeader />);

    fireEvent.click(screen.getByRole('button', { name: 'Open profile menu' }));

    expect(await screen.findByText(mockUser.name)).toBeInTheDocument();
    expect(screen.getByText(mockUser.email)).toBeInTheDocument();
  });
});
