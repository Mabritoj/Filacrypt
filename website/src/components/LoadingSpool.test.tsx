import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LoadingSpool } from './LoadingSpool';
import spinStyles from './spoolSpin.module.css';

describe('LoadingSpool', () => {
  it('renders the given message', () => {
    render(<LoadingSpool message="Loading spool…" />);
    expect(screen.getByText('Loading spool…')).toBeInTheDocument();
  });

  it('applies the shared spin animation to its icon', () => {
    const { container } = render(<LoadingSpool message="Loading spool…" />);
    expect(container.querySelector('svg')).toHaveClass(spinStyles.spin);
  });
});
