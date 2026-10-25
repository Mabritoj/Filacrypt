import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { Checkbox } from './Checkbox';

describe('Checkbox', () => {
  it('is named and toggled by its label', () => {
    const onChange = vi.fn();
    render(
      <Checkbox checked={false} onChange={onChange}>
        Only show low stock
      </Checkbox>,
    );
    const box = screen.getByRole('checkbox', { name: 'Only show low stock' });
    expect(box).not.toBeChecked();
    fireEvent.click(screen.getByText('Only show low stock'));
    expect(onChange).toHaveBeenCalledOnce();
  });
});
