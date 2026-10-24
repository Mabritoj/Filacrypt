import { describe, expect, it, vi } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { renderWithProviders } from '../../test/helpers';
import { ToggleGroup } from './ToggleGroup';

describe('ToggleGroup', () => {
  it('marks the current value as active', () => {
    renderWithProviders(
      <ToggleGroup
        label="WEIGHT UNIT"
        value="g"
        onChange={vi.fn()}
        options={[
          { value: 'g', label: 'Grams' },
          { value: 'kg', label: 'Kilograms' },
        ]}
      />,
    );

    expect(screen.getByRole('radio', { name: 'Grams' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('radio', { name: 'Kilograms' })).toHaveAttribute(
      'aria-checked',
      'false',
    );
  });

  it('calls onChange with the clicked option value', () => {
    const onChange = vi.fn();
    renderWithProviders(
      <ToggleGroup
        label="WEIGHT UNIT"
        value="g"
        onChange={onChange}
        options={[
          { value: 'g', label: 'Grams' },
          { value: 'kg', label: 'Kilograms' },
        ]}
      />,
    );

    fireEvent.click(screen.getByRole('radio', { name: 'Kilograms' }));
    expect(onChange).toHaveBeenCalledWith('kg');
  });
});
