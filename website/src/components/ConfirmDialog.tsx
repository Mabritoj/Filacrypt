import type { ReactNode } from 'react';
import { Button } from './Button';
import { ErrorMessage } from './ErrorMessage';
import { Modal } from './Modal';

export interface ConfirmDialogProps {
  title: string;
  /** What happens if they confirm; can include inputs (e.g. type-to-confirm). */
  children?: ReactNode;
  confirmLabel: string;
  /** Confirm-button label while `pending`, e.g. "Deleting…". */
  pendingLabel?: string;
  cancelLabel?: string;
  /** `destructive` for irreversible actions, `primary` otherwise. */
  tone?: 'destructive' | 'primary';
  /** The confirmed action is in flight: confirm shows a spinner and both buttons wait. */
  pending?: boolean;
  /** Hold the confirm button until the user has done what the body asks. */
  confirmDisabled?: boolean;
  /** Why the last attempt failed, shown above the buttons. */
  error?: string;
  onConfirm: () => void;
  onCancel: () => void;
  size?: 'sm' | 'md';
}

/** "Are you sure?" -- a Modal with Cancel + Confirm. Closes only through its buttons. */
export function ConfirmDialog({
  title,
  children,
  confirmLabel,
  pendingLabel,
  cancelLabel = 'Cancel',
  tone = 'destructive',
  pending = false,
  confirmDisabled = false,
  error,
  onConfirm,
  onCancel,
  size,
}: ConfirmDialogProps) {
  return (
    <Modal
      title={title}
      onCancel={onCancel}
      size={size}
      footer={
        <>
          <Button variant="secondary" onClick={onCancel} disabled={pending}>
            {cancelLabel}
          </Button>
          <Button variant={tone} onClick={onConfirm} loading={pending} disabled={confirmDisabled}>
            {pending && pendingLabel ? pendingLabel : confirmLabel}
          </Button>
        </>
      }
    >
      {children}
      {error && <ErrorMessage message={error} />}
    </Modal>
  );
}
