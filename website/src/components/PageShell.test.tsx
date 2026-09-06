import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PageShell } from './PageShell';

describe('PageShell', () => {
  it('renders children directly by default', () => {
    render(
      <PageShell>
        <h1>Inventory</h1>
      </PageShell>,
    );
    expect(screen.getByRole('heading', { name: 'Inventory' })).toBeInTheDocument();
  });

  it('renders children inside a centered status message when centered', () => {
    render(<PageShell centered>Loading inventory…</PageShell>);
    expect(screen.getByText('Loading inventory…')).toBeInTheDocument();
  });

  it('renders the header prop outside the centered wrapper', () => {
    render(
      <PageShell centered header={<div data-testid="page-header">Header</div>}>
        Loading…
      </PageShell>,
    );
    const header = screen.getByTestId('page-header');
    const message = screen.getByText('Loading…');
    expect(header).toBeInTheDocument();
    expect(message).toBeInTheDocument();
    expect(header.contains(message)).toBe(false);
    expect(message.contains(header)).toBe(false);
  });

  it('renders nothing extra when header is omitted', () => {
    render(<PageShell centered>Loading…</PageShell>);
    expect(screen.queryByTestId('page-header')).not.toBeInTheDocument();
  });
});
