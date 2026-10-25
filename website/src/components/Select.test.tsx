import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { Select } from './Select';

describe('Select', () => {
  it('renders a native select with its options', () => {
    const onChange = vi.fn();
    render(
      <Select aria-label="Status" value="stored" onChange={onChange}>
        <option value="in_use">In use</option>
        <option value="stored">Stored</option>
      </Select>,
    );
    const select = screen.getByRole('combobox', { name: 'Status' });
    expect(select).toHaveValue('stored');
    fireEvent.change(select, { target: { value: 'in_use' } });
    expect(onChange).toHaveBeenCalledOnce();
  });
});
