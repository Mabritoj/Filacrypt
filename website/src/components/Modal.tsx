import {
  useId,
  useLayoutEffect,
  useRef,
  type MouseEvent,
  type ReactNode,
  type SyntheticEvent,
} from 'react';
import { cx } from '../utils/cx';
import styles from './Modal.module.css';

export interface ModalProps {
  title: string;
  children: ReactNode;
  /** Actions row under the body, right-aligned -- usually Buttons. */
  footer?: ReactNode;
  /**
   * Called when the dialog asks to close: on Escape (unless `closeOnEscape`
   * is off), on a backdrop click (if `closeOnBackdropClick`), and whenever the
   * browser closes it natively.
   */
  onCancel: () => void;
  /**
   * Escape closes it -- the standard dialog key, and always deliberate.
   * Turn off while closing would be wrong, e.g. mid-request.
   */
  closeOnEscape?: boolean;
  /**
   * A click/tap outside closes it. Off by default: on a phone or iPad a stray
   * tap is easy, and it shouldn't throw away a decision in progress.
   */
  closeOnBackdropClick?: boolean;
  size?: 'sm' | 'md';
}

/**
 * A modal dialog, open for as long as it's rendered: mount it to show it,
 * unmount it to close it. Built on the native <dialog> + showModal(), so the
 * browser handles the top layer, page inertness and focus trapping; focus
 * returns to whatever had it before the dialog opened.
 */
export function Modal({
  title,
  children,
  footer,
  onCancel,
  closeOnEscape = true,
  closeOnBackdropClick = false,
  size = 'sm',
}: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const onCancelRef = useRef(onCancel);
  onCancelRef.current = onCancel;

  useLayoutEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const previouslyFocused =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    let closingOnUnmount = false;

    // A native close we didn't ask for -- e.g. Chrome lets a repeated Escape
    // through even when `cancel` is prevented. Report it so the parent's
    // state matches what's on screen instead of leaving an invisible dialog.
    // `close` fires asynchronously, so one queued by an earlier cleanup (React
    // StrictMode mounts effects twice in dev) can land after the dialog has
    // been reopened -- only an event that finds it actually closed counts.
    function handleClose() {
      if (!closingOnUnmount && !dialog?.open) onCancelRef.current();
    }

    dialog.addEventListener('close', handleClose);
    if (!dialog.open) dialog.showModal();

    return () => {
      closingOnUnmount = true;
      dialog.removeEventListener('close', handleClose);
      dialog.close();
      if (previouslyFocused?.isConnected) previouslyFocused.focus();
    };
  }, []);

  function handleCancel(event: SyntheticEvent<HTMLDialogElement>) {
    // Escape. Prevent the native close either way; if allowed, close through
    // the parent so the dialog unmounts like every other way of closing.
    event.preventDefault();
    if (closeOnEscape) onCancel();
  }

  function handleClick(event: MouseEvent<HTMLDialogElement>) {
    if (closeOnBackdropClick && event.target === event.currentTarget) onCancel();
  }

  return (
    <dialog
      ref={dialogRef}
      className={cx(styles.dialog, styles[size])}
      aria-labelledby={titleId}
      onCancel={handleCancel}
      onClick={handleClick}
    >
      <div className={styles.content}>
        <h2 id={titleId} className={styles.title}>
          {title}
        </h2>
        <div className={styles.body}>{children}</div>
        {footer && <div className={styles.footer}>{footer}</div>}
      </div>
    </dialog>
  );
}
