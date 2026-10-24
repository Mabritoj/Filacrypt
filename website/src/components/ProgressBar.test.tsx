import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ProgressBar } from './ProgressBar';

describe('ProgressBar', () => {
  it('exposes its value to assistive tech', () => {
    render(<ProgressBar label="Filament remaining" value={720} max={1000} />);
    const bar = screen.getByRole('progressbar', { name: 'Filament remaining' });
    expect(bar).toHaveAttribute('aria-valuenow', '720');
    expect(bar).toHaveAttribute('aria-valuemax', '1000');
  });

  it('sizes the fill as a percentage of max', () => {
    render(<ProgressBar label="Memory used" value={168} max={336} />);
    const fill = screen.getByRole('progressbar').firstElementChild as HTMLElement;
    expect(fill.style.getPropertyValue('--progress')).toBe('50%');
  });

  it('clamps values outside the range', () => {
    render(<ProgressBar label="Over" value={150} />);
    const bar = screen.getByRole('progressbar');
    expect(bar).toHaveAttribute('aria-valuenow', '100');
    expect((bar.firstElementChild as HTMLElement).style.getPropertyValue('--progress')).toBe(
      '100%',
    );
  });

  it('handles a zero max without dividing by zero', () => {
    render(<ProgressBar label="Empty" value={0} max={0} />);
    const fill = screen.getByRole('progressbar').firstElementChild as HTMLElement;
    expect(fill.style.getPropertyValue('--progress')).toBe('0%');
  });
});
