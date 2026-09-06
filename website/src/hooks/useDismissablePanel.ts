import { useEffect, useRef } from 'react';

/**
 * Attach the returned ref to a panel/dropdown's container. While `isOpen`,
 * clicking outside it or pressing Escape calls `onClose`. `onClose` is read
 * from a ref internally, so passing a fresh inline function each render
 * doesn't re-subscribe the listeners.
 */
export function useDismissablePanel<T extends HTMLElement>(isOpen: boolean, onClose: () => void) {
  const ref = useRef<T>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!isOpen) return;

    function handlePointerDown(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        onCloseRef.current();
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onCloseRef.current();
    }

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  return ref;
}
