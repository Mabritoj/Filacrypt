import { describe, expect, test, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AuthenticatedLayout } from './AuthenticatedLayout';

vi.mock('../components/RequireProfile', () => ({
  RequireProfile: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock('../features/chat/ChatWidget', () => ({
  ChatWidget: () => <div>chat widget</div>,
}));

describe('AuthenticatedLayout', () => {
  test('renders the routed page alongside the chat widget', () => {
    render(
      <MemoryRouter initialEntries={['/inventory']}>
        <Routes>
          <Route element={<AuthenticatedLayout />}>
            <Route path="/inventory" element={<div>inventory page</div>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText('inventory page')).toBeInTheDocument();
    expect(screen.getByText('chat widget')).toBeInTheDocument();
  });
});
