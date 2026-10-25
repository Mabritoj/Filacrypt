import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../test/helpers';
import { Button } from './Button';
import { EmptyState } from './EmptyState';

describe('EmptyState', () => {
  it('renders the eyebrow, title, body and action', () => {
    renderWithProviders(
      <EmptyState
        eyebrow="Coming soon"
        title="This page isn't built yet."
        titleAs="h1"
        action={<Button to="/">Back to Filacrypt</Button>}
      >
        Check back later.
      </EmptyState>,
    );

    expect(screen.getByText('Coming soon')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 1, name: "This page isn't built yet." }),
    ).toBeInTheDocument();
    expect(screen.getByText('Check back later.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to Filacrypt' })).toHaveAttribute('href', '/');
  });

  it('uses an h2 by default', () => {
    renderWithProviders(<EmptyState title="Spool not found." />);
    expect(screen.getByRole('heading', { level: 2, name: 'Spool not found.' })).toBeInTheDocument();
  });
});
