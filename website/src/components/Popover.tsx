import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  type CSSProperties,
  type KeyboardEvent,
  type ReactNode,
  type Ref,
} from 'react';
import { useDismissablePanel } from '../hooks/useDismissablePanel';
import { cx } from '../utils/cx';
import styles from './Popover.module.css';

export interface PopoverTriggerProps {
  ref: Ref<HTMLButtonElement>;
  'aria-haspopup': 'dialog';
  'aria-expanded': boolean;
  'aria-controls': string | undefined;
  onClick: () => void;
}

export interface PopoverProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Accessible name for the panel, e.g. "Filters". */
  label: string;
  /** Renders the button that toggles the panel; spread the props onto it. */
  trigger: (props: PopoverTriggerProps) => ReactNode;
  children: ReactNode;
  align?: 'start' | 'end';
  /** Panel width in px on wider screens. On phones it's a full-width bottom sheet. */
  width?: number;
  /** Extra class for the panel (cosmetics like background -- not size or position). */
  className?: string;
}

/**
 * A non-modal panel anchored to its trigger -- a bottom sheet with a backdrop
 * at phone widths. Focus moves into it on open; Escape closes it and returns
 * focus to the trigger, as does closing it from inside (an Apply button). A
 * press outside just closes it.
 */
export function Popover({
  open,
  onOpenChange,
  label,
  trigger,
  children,
  align = 'end',
  width = 320,
  className,
}: PopoverProps) {
  const panelId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const rootRef = useDismissablePanel<HTMLDivElement>(open, () => onOpenChange(false));

  useEffect(() => {
    if (open) panelRef.current?.focus();
  }, [open]);

  useLayoutEffect(() => {
    if (!open) return;
    const panel = panelRef.current;
    return () => {
      // If focus was inside the panel when it closed, it's now on <body>
      // (or still on a detached node) -- hand it back to the trigger rather
      // than lose it. Focus already elsewhere is left alone, and a press
      // outside still ends with focus on what was pressed: the browser
      // focuses it after this runs.
      const active = document.activeElement;
      if (!active || active === document.body || panel?.contains(active)) {
        triggerRef.current?.focus();
      }
    };
  }, [open]);

  function handleKeyDown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      event.stopPropagation();
      onOpenChange(false);
    }
  }

  // Runtime geometry reaches CSS only as a custom property (see ProgressBar).
  const panelStyle = { '--popover-width': `${width}px` } as CSSProperties;

  return (
    <div className={styles.root} ref={rootRef}>
      {trigger({
        ref: triggerRef,
        'aria-haspopup': 'dialog',
        'aria-expanded': open,
        'aria-controls': open ? panelId : undefined,
        onClick: () => onOpenChange(!open),
      })}
      {open && (
        <>
          <div className={styles.backdrop} aria-hidden="true" onClick={() => onOpenChange(false)} />
          <div
            ref={panelRef}
            id={panelId}
            role="dialog"
            aria-label={label}
            tabIndex={-1}
            className={cx(styles.panel, styles[align], className)}
            style={panelStyle}
            onKeyDown={handleKeyDown}
          >
            {children}
          </div>
        </>
      )}
    </div>
  );
}
