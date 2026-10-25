import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { NumberInput } from './NumberInput';

describe('NumberInput', () => {
  it('renders a number box', () => {
    render(<NumberInput aria-label="Bed temp" defaultValue={60} />);
    expect(screen.getByRole('spinbutton', { name: 'Bed temp' })).toHaveValue(60);
  });

  it('shows a unit without making it part of the name', () => {
    const onChange = vi.fn();
    render(<NumberInput aria-label="Diameter" unit="mm" value={1.75} onChange={onChange} />);
    const input = screen.getByRole('spinbutton', { name: 'Diameter' });
    expect(screen.getByText('mm')).toHaveAttribute('aria-hidden', 'true');
    fireEvent.change(input, { target: { value: '2.85' } });
    expect(onChange).toHaveBeenCalledOnce();
  });
});
