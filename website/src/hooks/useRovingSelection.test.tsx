import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { useRovingSelection } from './useRovingSelection';

const VALUES = ['a', 'b', 'c'] as const;

function Group({ axis, onSelect }: { axis?: 'horizontal' | 'both'; onSelect?: () => void }) {
  const [selected, setSelected] = useState<(typeof VALUES)[number]>('a');
  const { onKeyDown, itemProps } = useRovingSelection(
    VALUES,
    selected,
    (value) => {
      setSelected(value);
      onSelect?.();
    },
    axis,
  );
  return (
    <div onKeyDown={onKeyDown}>
      {VALUES.map((value) => (
        <button key={value} type="button" {...itemProps(value)} aria-pressed={value === selected}>
          {value}
        </button>
      ))}
    </div>
  );
}

const button = (name: string) => screen.getByRole('button', { name });

describe('useRovingSelection', () => {
  it('makes only the selected item a tab stop', () => {
    render(<Group />);
    expect(button('a')).toHaveAttribute('tabindex', '0');
    expect(button('b')).toHaveAttribute('tabindex', '-1');
  });

  it('moves selection and focus with the arrow keys, wrapping', () => {
    render(<Group />);
    button('a').focus();
    fireEvent.keyDown(button('a'), { key: 'ArrowRight' });
    expect(button('b')).toHaveFocus();
    expect(button('b')).toHaveAttribute('aria-pressed', 'true');
    fireEvent.keyDown(button('b'), { key: 'ArrowLeft' });
    fireEvent.keyDown(button('a'), { key: 'ArrowLeft' });
    expect(button('c')).toHaveFocus();
    fireEvent.keyDown(button('c'), { key: 'ArrowDown' });
    expect(button('a')).toHaveFocus();
  });

  it('jumps to the ends with Home and End', () => {
    render(<Group />);
    fireEvent.keyDown(button('a'), { key: 'End' });
    expect(button('c')).toHaveFocus();
    fireEvent.keyDown(button('c'), { key: 'Home' });
    expect(button('a')).toHaveFocus();
  });

  it('ignores Up/Down on a horizontal group so the page can scroll', () => {
    const onSelect = vi.fn();
    render(<Group axis="horizontal" onSelect={onSelect} />);
    fireEvent.keyDown(button('a'), { key: 'ArrowDown' });
    expect(onSelect).not.toHaveBeenCalled();
  });
});
