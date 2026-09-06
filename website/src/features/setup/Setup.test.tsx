import { describe, expect, it } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { server } from '../../test/msw/server';
import { renderWithProviders } from '../../test/helpers';
import { Setup } from './Setup';
import { mockUser } from '../../api/mock/user';

describe('Setup', () => {
  it('renders the name and username fields', () => {
    renderWithProviders(<Setup />);

    expect(screen.getByLabelText('Name')).toBeInTheDocument();
    expect(screen.getByLabelText('Username')).toBeInTheDocument();
  });

  it('submits the form and calls POST /user/setup with the entered values', async () => {
    let receivedBody: unknown = null;
    server.use(
      http.post(`${import.meta.env.VITE_API_URL}/user/setup`, async ({ request }) => {
        receivedBody = await request.json();
        return HttpResponse.json({ user: mockUser, workspaceIds: ['ws-1'] }, { status: 201 });
      }),
    );

    renderWithProviders(<Setup />);

    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Jonathan Mabrito' } });
    fireEvent.change(screen.getByLabelText('Username'), { target: { value: 'jmabrito' } });
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));

    await waitFor(() =>
      expect(receivedBody).toEqual({ name: 'Jonathan Mabrito', username: 'jmabrito' }),
    );
  });

  it('shows the backend error message on failure', async () => {
    server.use(
      http.post(`${import.meta.env.VITE_API_URL}/user/setup`, () =>
        HttpResponse.json(
          { error: { code: 'USERNAME_TAKEN', message: 'Username is already taken' } },
          { status: 409 },
        ),
      ),
    );

    renderWithProviders(<Setup />);

    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Jonathan' } });
    fireEvent.change(screen.getByLabelText('Username'), { target: { value: 'taken' } });
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));

    expect(await screen.findByText('Username is already taken')).toBeInTheDocument();
  });
});
