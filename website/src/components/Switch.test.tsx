import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { Switch, SwitchIndicator } from './Switch';

describe('Switch', () => {
  it('is a switch named by its label', () => {
    render(
      <Switch checked onChange={vi.fn()}>
        Dark mode
      </Switch>,
    );
    expect(screen.getByRole('switch', { name: 'Dark mode' })).toBeChecked();
  });

  it('toggles from its label', () => {
    const onChange = vi.fn();
    render(
      <Switch checked={false} onChange={onChange}>
        Low-stock emails
      </Switch>,
    );
    fireEvent.click(screen.getByText('Low-stock emails'));
    expect(onChange).toHaveBeenCalledOnce();
  });
});

describe('SwitchIndicator', () => {
  it('is decorative and reflects its state', () => {
    const { container } = render(<SwitchIndicator on />);
    const track = container.firstElementChild;
    expect(track).toHaveAttribute('aria-hidden', 'true');
    expect(track).toHaveAttribute('data-on', 'true');
  });
});
