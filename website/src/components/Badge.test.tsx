import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Badge } from './Badge';

describe('Badge', () => {
  it('renders a tag with its text as written', () => {
    render(<Badge>Glitter</Badge>);
    expect(screen.getByText('Glitter')).toBeInTheDocument();
  });

  it('adds a decorative dot to status badges', () => {
    render(
      <Badge variant="status" tone="success">
        Healthy
      </Badge>,
    );
    const badge = screen.getByText('Healthy');
    expect(badge.querySelector('[aria-hidden="true"]')).toBeInTheDocument();
  });

  it('has no dot as a tag', () => {
    render(<Badge tone="warning">Low</Badge>);
    expect(screen.getByText('Low').querySelector('[aria-hidden="true"]')).not.toBeInTheDocument();
  });
});
