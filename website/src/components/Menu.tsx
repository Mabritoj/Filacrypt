import {
  createContext,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
  type Ref,
} from 'react';
import { flushSync } from 'react-dom';
import { useDismissablePanel } from '../hooks/useDismissablePanel';
import { cx } from '../utils/cx';
import { ActionElement, type ActionProps } from './ActionElement';
import styles from './Menu.module.css';

export interface MenuTriggerProps {
  ref: Ref<HTMLButtonElement>;
  'aria-haspopup': 'menu';
  'aria-expanded': boolean;
  'aria-controls': string | undefined;
  onClick: () => void;
  onKeyDown: (event: KeyboardEvent) => void;
}

interface MenuApi {
  /** Close the menu and return focus to its trigger. */
  close: () => void;
}

export interface MenuProps {
  /** Accessible name for the menu, e.g. "Spool options". */
  label: string;
  /** Renders the button that opens the menu; spread the props onto it. */
  trigger: (props: MenuTriggerProps) => ReactNode;
  /**
   * MenuGroups of MenuItems -- or a function receiving `close`, for custom
   * content (a header, an icon link) that should close the menu too.
   */
  children: ReactNode | ((api: MenuApi) => ReactNode);
  /** Which edge of the trigger the panel lines up with. */
  align?: 'start' | 'end';
  /** Extra class for the panel (width, padding). */
  className?: string;
}

const MenuContext = createContext<MenuApi | null>(null);

/** Everything in the panel that keyboard navigation should stop on. */
const FOCUSABLE = 'a[href], button:not(:disabled), [role^="menuitem"]:not([aria-disabled="true"])';

function focusableIn(panel: HTMLElement | null): HTMLElement[] {
  return panel ? Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE)) : [];
}

/**
 * A dropdown menu. Opens from its trigger (click, Enter/Space, or ArrowDown/Up
 * to land on the first/last item); inside, the arrow keys and Home/End move
 * between items, Escape closes and returns focus to the trigger, and Tab or a
 * click outside just closes. Choosing a MenuItem closes it.
 */
export function Menu({ label, trigger, children, align = 'end', className }: MenuProps) {
  const [open, setOpen] = useState(false);
  const [initialFocus, setInitialFocus] = useState<'first' | 'last'>('first');
  const menuId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const rootRef = useDismissablePanel<HTMLDivElement>(open, () => setOpen(false));

  useEffect(() => {
    if (!open) return;
    const list = focusableIn(panelRef.current);
    (initialFocus === 'last' ? list[list.length - 1] : list[0])?.focus();
  }, [open, initialFocus]);

  function close() {
    setOpen(false);
    // The trigger can unmount with the choice (e.g. entering edit mode
    // swaps the header actions) -- only refocus it if it's still there.
    if (triggerRef.current?.isConnected) triggerRef.current.focus();
  }

  function openAt(position: 'first' | 'last') {
    setInitialFocus(position);
    setOpen(true);
  }

  function handleTriggerKeyDown(event: KeyboardEvent) {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      openAt(event.key === 'ArrowDown' ? 'first' : 'last');
    }
  }

  function handlePanelKeyDown(event: KeyboardEvent) {
    const list = focusableIn(panelRef.current);
    const current = list.indexOf(document.activeElement as HTMLElement);
    const last = list.length - 1;
    let next: number | undefined;
    switch (event.key) {
      case 'ArrowDown':
        next = current >= last ? 0 : current + 1;
        break;
      case 'ArrowUp':
        next = current <= 0 ? last : current - 1;
        break;
      case 'Home':
        next = 0;
        break;
      case 'End':
        next = last;
        break;
      case 'Escape':
        event.preventDefault();
        event.stopPropagation();
        close();
        return;
      case 'Tab':
        // Leave the menu the way focus would leave the trigger: close it now
        // (synchronously, so its items are gone before the browser moves
        // focus), park focus on the trigger, and let Tab continue from there.
        flushSync(() => setOpen(false));
        triggerRef.current?.focus();
        return;
      default:
        return;
    }
    event.preventDefault();
    list[next]?.focus();
  }

  const api: MenuApi = { close };

  return (
    <div className={styles.root} ref={rootRef}>
      {trigger({
        ref: triggerRef,
        'aria-haspopup': 'menu',
        'aria-expanded': open,
        'aria-controls': open ? menuId : undefined,
        onClick: () => (open ? setOpen(false) : openAt('first')),
        onKeyDown: handleTriggerKeyDown,
      })}
      {open && (
        <MenuContext.Provider value={api}>
          <div
            ref={panelRef}
            id={menuId}
            role="menu"
            aria-label={label}
            className={cx(styles.panel, styles[align], className)}
            onKeyDown={handlePanelKeyDown}
          >
            {typeof children === 'function' ? children(api) : children}
          </div>
        </MenuContext.Provider>
      )}
    </div>
  );
}

interface MenuItemOwnProps {
  tone?: 'default' | 'destructive';
  /** Makes it a `menuitemcheckbox` with this state (e.g. a dark-mode toggle). */
  checked?: boolean;
  /** Close the menu after choosing it. Defaults to true, or false for a checkbox item. */
  closeOnSelect?: boolean;
  className?: string;
  children: ReactNode;
}

/** One choice in a Menu. Like Button, `to`/`href` render a link. */
export type MenuItemProps = ActionProps<MenuItemOwnProps>;

export function MenuItem({
  tone = 'default',
  checked,
  closeOnSelect,
  className,
  children,
  ...rest
}: MenuItemProps) {
  const menu = useContext(MenuContext);
  const isCheckbox = checked !== undefined;
  const shouldClose = closeOnSelect ?? !isCheckbox;
  const { onClick } = rest as { onClick?: (event: MouseEvent<HTMLElement>) => void };

  return (
    <ActionElement
      {...rest}
      role={isCheckbox ? 'menuitemcheckbox' : 'menuitem'}
      aria-checked={isCheckbox ? checked : undefined}
      tabIndex={-1}
      className={cx(styles.item, tone === 'destructive' && styles.destructive, className)}
      onClick={(event: MouseEvent<HTMLElement>) => {
        onClick?.(event);
        if (shouldClose) menu?.close();
      }}
    >
      {children}
    </ActionElement>
  );
}

export interface MenuGroupProps {
  children: ReactNode;
  className?: string;
}

/** A run of related items, padded inside the panel; consecutive groups get a divider. */
export function MenuGroup({ children, className }: MenuGroupProps) {
  return (
    <div role="group" className={cx(styles.group, className)}>
      {children}
    </div>
  );
}
