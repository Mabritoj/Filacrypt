import { useRef, type KeyboardEvent } from 'react';

/**
 * Arrow-key selection for a single-choice group (radiogroup, tablist): the
 * selected item is the only tab stop, and the arrow keys (plus Home/End) move
 * selection and focus together, wrapping at the ends.
 *
 * `axis` limits which arrows count: tabs use `horizontal` so Up/Down still
 * scroll the page; radio-style groups use `both`.
 */
export function useRovingSelection<T extends string>(
  values: readonly T[],
  selected: T,
  onSelect: (value: T) => void,
  axis: 'horizontal' | 'both' = 'both',
) {
  const elements = useRef(new Map<T, HTMLElement>());

  function register(value: T) {
    return (element: HTMLElement | null) => {
      if (element) elements.current.set(value, element);
      else elements.current.delete(value);
    };
  }

  function onKeyDown(event: KeyboardEvent) {
    if (values.length === 0) return;
    const current = values.indexOf(selected);
    const last = values.length - 1;
    let next: number;
    switch (event.key) {
      case 'ArrowRight':
        next = current >= last ? 0 : current + 1;
        break;
      case 'ArrowLeft':
        next = current <= 0 ? last : current - 1;
        break;
      case 'ArrowDown':
        if (axis === 'horizontal') return;
        next = current >= last ? 0 : current + 1;
        break;
      case 'ArrowUp':
        if (axis === 'horizontal') return;
        next = current <= 0 ? last : current - 1;
        break;
      case 'Home':
        next = 0;
        break;
      case 'End':
        next = last;
        break;
      default:
        return;
    }
    event.preventDefault();
    const value = values[next];
    onSelect(value);
    elements.current.get(value)?.focus();
  }

  /** Spread onto each item: its ref and roving tabIndex. */
  function itemProps(value: T) {
    const isTabStop = value === selected || (!values.includes(selected) && value === values[0]);
    return { ref: register(value), tabIndex: isTabStop ? 0 : -1 };
  }

  return { onKeyDown, itemProps };
}
