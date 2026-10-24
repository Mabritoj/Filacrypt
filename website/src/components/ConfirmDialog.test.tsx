import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { ConfirmDialog } from './ConfirmDialog';

function renderDialog(props: Partial<Parameters<typeof ConfirmDialog>[0]> = {}) {
  const onConfirm = vi.fn();
  const onCancel = vi.fn();
  render(
    <ConfirmDialog
      title="Delete this spool?"
      confirmLabel="Delete"
      pendingLabel="Deleting…"
      onConfirm={onConfirm}
      onCancel={onCancel}
      {...props}
    >
      This can&apos;t be undone.
    </ConfirmDialog>,
  );
  return { onConfirm, onCancel };
}

describe('ConfirmDialog', () => {
  it('confirms and cancels through its buttons', () => {
    const { onConfirm, onCancel } = renderDialog();
    const dialog = screen.getByRole('dialog', { name: 'Delete this spool?' });
    expect(dialog).toHaveTextContent("This can't be undone.");

    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    expect(onConfirm).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it('shows progress and blocks both buttons while pending', () => {
    renderDialog({ pending: true });
    const confirm = screen.getByRole('button', { name: 'Deleting…' });
    expect(confirm).toBeDisabled();
    expect(confirm).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();
  });

  it('holds the confirm button until allowed', () => {
    renderDialog({ confirmDisabled: true });
    expect(screen.getByRole('button', { name: 'Delete' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeEnabled();
  });

  it('announces an error', () => {
    renderDialog({ error: 'Network error' });
    expect(screen.getByRole('alert')).toHaveTextContent('Network error');
  });
});
