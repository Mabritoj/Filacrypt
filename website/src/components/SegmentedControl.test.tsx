import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { SegmentedControl } from './SegmentedControl';

const options = [
  { value: 'g', label: 'Grams' },
  { value: 'kg', label: 'Kilograms' },
] as const;

function renderControl(onChange = vi.fn()) {
  render(
    <SegmentedControl label="Weight unit" value="g" onChange={onChange} options={[...options]} />,
  );
  return onChange;
}

describe('SegmentedControl', () => {
  it('is a radio group named by its visible label', () => {
    renderControl();
    expect(screen.getByRole('radiogroup', { name: 'Weight unit' })).toBeInTheDocument();
  });

  it('marks the current value as checked', () => {
    renderControl();
    expect(screen.getByRole('radio', { name: 'Grams' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('radio', { name: 'Kilograms' })).toHaveAttribute(
      'aria-checked',
      'false',
    );
  });

  it('calls onChange with the clicked option value', () => {
    const onChange = renderControl();
    fireEvent.click(screen.getByRole('radio', { name: 'Kilograms' }));
    expect(onChange).toHaveBeenCalledWith('kg');
  });

  it('changes the value with the arrow keys', () => {
    const onChange = renderControl();
    const grams = screen.getByRole('radio', { name: 'Grams' });
    expect(grams).toHaveAttribute('tabindex', '0');
    fireEvent.keyDown(grams, { key: 'ArrowRight' });
    expect(onChange).toHaveBeenCalledWith('kg');
  });
});
