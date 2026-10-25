import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { TextInput } from './TextInput';

describe('TextInput', () => {
  it('renders a text box that passes native props through', () => {
    const onChange = vi.fn();
    render(<TextInput aria-label="Search" placeholder="Search…" onChange={onChange} />);
    const input = screen.getByRole('textbox', { name: 'Search' });
    expect(input).toHaveAttribute('placeholder', 'Search…');
    fireEvent.change(input, { target: { value: 'PLA' } });
    expect(onChange).toHaveBeenCalledOnce();
  });

  it('works without a Field', () => {
    render(<TextInput aria-label="Vendor" />);
    expect(screen.getByRole('textbox', { name: 'Vendor' })).not.toHaveAttribute('aria-invalid');
  });
});
