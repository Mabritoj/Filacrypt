import { expect, test } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { server } from '../../test/msw/server';
import { renderWithProviders } from '../../test/helpers';
import { MembersSection } from './MembersSection';
import { mockMembers } from '../../api/mock/members';

const API_URL = import.meta.env.VITE_API_URL;

function stubMembers() {
  server.use(
    http.get(`${API_URL}/workspaces/workspace-1/members`, () =>
      HttpResponse.json({ members: mockMembers }),
    ),
  );
}

test('renders without crashing and lists every member', async () => {
  stubMembers();
  renderWithProviders(<MembersSection workspaceId="workspace-1" callerRole="owner" />);

  await waitFor(() => expect(screen.getByText('Ada Lovelace')).toBeInTheDocument());
  expect(screen.getByText('Grace Hopper')).toBeInTheDocument();
  expect(screen.getByText('Hedy Lamarr')).toBeInTheDocument();
});

test('a member-role caller sees the roster but no invite form or role controls', async () => {
  stubMembers();
  renderWithProviders(<MembersSection workspaceId="workspace-1" callerRole="member" />);

  await waitFor(() => expect(screen.getByText('Ada Lovelace')).toBeInTheDocument());
  expect(screen.queryByRole('textbox', { name: /email/i })).not.toBeInTheDocument();
  expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
});

test('an admin caller sees permission toggles but no role dropdown', async () => {
  stubMembers();
  renderWithProviders(<MembersSection workspaceId="workspace-1" callerRole="admin" />);

  await waitFor(() => expect(screen.getByText('Hedy Lamarr')).toBeInTheDocument());
  expect(screen.getByRole('checkbox', { name: /read/i })).toBeInTheDocument();
  expect(screen.queryByRole('combobox', { name: /role/i })).not.toBeInTheDocument();
});

test('owner can invite a member by email', async () => {
  stubMembers();
  server.use(
    http.post(`${API_URL}/workspaces/workspace-1/members`, async ({ request }) => {
      const body = await request.json();
      expect(body).toEqual({ email: 'new@example.com' });
      return HttpResponse.json(
        { member: { ...mockMembers[2], userId: 'user-4', email: 'new@example.com' } },
        { status: 201 },
      );
    }),
  );

  renderWithProviders(<MembersSection workspaceId="workspace-1" callerRole="owner" />);
  await waitFor(() => expect(screen.getByText('Ada Lovelace')).toBeInTheDocument());

  fireEvent.change(screen.getByRole('textbox', { name: /email/i }), {
    target: { value: 'new@example.com' },
  });
  fireEvent.click(screen.getByRole('button', { name: /invite/i }));

  await waitFor(() => expect(screen.getByText('new@example.com')).toBeInTheDocument());
});

test('owner can remove a member after confirming', async () => {
  stubMembers();
  server.use(
    http.delete(
      `${API_URL}/workspaces/workspace-1/members/user-3`,
      () => new HttpResponse(null, { status: 204 }),
    ),
  );

  renderWithProviders(<MembersSection workspaceId="workspace-1" callerRole="owner" />);
  await waitFor(() => expect(screen.getByText('Hedy Lamarr')).toBeInTheDocument());

  fireEvent.click(screen.getByRole('button', { name: /remove hedy lamarr/i }));
  fireEvent.click(screen.getByRole('button', { name: /^remove$/i }));

  await waitFor(() => expect(screen.queryByText('Hedy Lamarr')).not.toBeInTheDocument());
});

test('a 403 while inviting shows the fixed permission-denied message', async () => {
  stubMembers();
  server.use(
    http.post(
      `${API_URL}/workspaces/workspace-1/members`,
      () => new HttpResponse(null, { status: 403 }),
    ),
  );

  renderWithProviders(<MembersSection workspaceId="workspace-1" callerRole="admin" />);
  await waitFor(() => expect(screen.getByText('Ada Lovelace')).toBeInTheDocument());

  fireEvent.change(screen.getByRole('textbox', { name: /email/i }), {
    target: { value: 'nobody@example.com' },
  });
  fireEvent.click(screen.getByRole('button', { name: /invite/i }));

  await waitFor(() =>
    expect(screen.getByText("You don't have permission to do that.")).toBeInTheDocument(),
  );
});

test("the workspace owner's own row has no remove button", async () => {
  stubMembers();
  renderWithProviders(<MembersSection workspaceId="workspace-1" callerRole="owner" />);

  await waitFor(() => expect(screen.getByText('Ada Lovelace')).toBeInTheDocument());
  expect(screen.queryByRole('button', { name: /remove ada lovelace/i })).not.toBeInTheDocument();
});
