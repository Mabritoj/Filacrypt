import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { Chip } from './Chip';

describe('Chip', () => {
  it('is a toggle button reporting its state', () => {
    const onClick = vi.fn();
    render(
      <Chip pressed={false} onClick={onClick}>
        PETG
      </Chip>,
    );
    const chip = screen.getByRole('button', { name: 'PETG' });
    expect(chip).toHaveAttribute('aria-pressed', 'false');
    expect(chip).toHaveAttribute('type', 'button');
    fireEvent.click(chip);
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('reflects the pressed state', () => {
    render(<Chip pressed>PLA</Chip>);
    expect(screen.getByRole('button', { name: 'PLA' })).toHaveAttribute('aria-pressed', 'true');
  });
});
