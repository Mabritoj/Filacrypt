import { describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { StrictMode, useState } from 'react';
import { Modal } from './Modal';

function cancelEvent() {
  return new Event('cancel', { cancelable: true });
}

describe('Modal', () => {
  it('opens as a dialog named by its title', () => {
    render(
      <Modal title="Delete this spool?" onCancel={vi.fn()}>
        <p>This can&apos;t be undone.</p>
      </Modal>,
    );

    const dialog = screen.getByRole('dialog', { name: 'Delete this spool?' });
    expect(dialog).toHaveAttribute('open');
    expect(screen.getByText("This can't be undone.")).toBeInTheDocument();
  });

  it('renders footer actions', () => {
    render(
      <Modal title="Title" onCancel={vi.fn()} footer={<button type="button">Confirm</button>}>
        Body
      </Modal>,
    );
    expect(screen.getByRole('button', { name: 'Confirm' })).toBeInTheDocument();
  });

  describe('by default (not dismissible)', () => {
    it('ignores backdrop clicks', () => {
      const onCancel = vi.fn();
      render(
        <Modal title="Delete this spool?" onCancel={onCancel}>
          <p>Body</p>
        </Modal>,
      );

      // A click on the <dialog> element itself is a click on its backdrop.
      fireEvent.click(screen.getByRole('dialog'));
      expect(onCancel).not.toHaveBeenCalled();
    });

    it('blocks Escape', () => {
      const onCancel = vi.fn();
      render(
        <Modal title="Delete this spool?" onCancel={onCancel}>
          <p>Body</p>
        </Modal>,
      );

      const event = cancelEvent();
      fireEvent(screen.getByRole('dialog'), event);
      expect(event.defaultPrevented).toBe(true);
      expect(onCancel).not.toHaveBeenCalled();
    });

    it('ignores clicks inside the content', () => {
      const onCancel = vi.fn();
      render(
        <Modal title="Title" onCancel={onCancel} dismissible>
          <p>Body</p>
        </Modal>,
      );
      fireEvent.click(screen.getByText('Body'));
      expect(onCancel).not.toHaveBeenCalled();
    });
  });

  describe('when dismissible', () => {
    it('closes on a backdrop click', () => {
      const onCancel = vi.fn();
      render(
        <Modal title="Filters" onCancel={onCancel} dismissible>
          <p>Body</p>
        </Modal>,
      );
      fireEvent.click(screen.getByRole('dialog'));
      expect(onCancel).toHaveBeenCalledOnce();
    });

    it('closes on Escape', () => {
      const onCancel = vi.fn();
      render(
        <Modal title="Filters" onCancel={onCancel} dismissible>
          <p>Body</p>
        </Modal>,
      );
      fireEvent(screen.getByRole('dialog'), cancelEvent());
      expect(onCancel).toHaveBeenCalledOnce();
    });
  });

  it('reports a native close it did not initiate', async () => {
    const onCancel = vi.fn();
    render(
      <Modal title="Title" onCancel={onCancel}>
        Body
      </Modal>,
    );
    act(() => (screen.getByRole('dialog') as HTMLDialogElement).close());
    await waitFor(() => expect(onCancel).toHaveBeenCalledOnce());
  });

  it('stays open under StrictMode despite the double-mounted effect', async () => {
    // Regression: the first mount's cleanup closes the dialog, and its
    // late-arriving `close` event used to be reported as a cancel.
    const onCancel = vi.fn();
    render(
      <StrictMode>
        <Modal title="Title" onCancel={onCancel}>
          Body
        </Modal>
      </StrictMode>,
    );
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(onCancel).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog')).toHaveAttribute('open');
  });

  it('returns focus to the opener when it unmounts, without reporting a cancel', () => {
    const onCancel = vi.fn();
    function Harness() {
      const [open, setOpen] = useState(false);
      return (
        <>
          <button type="button" onClick={() => setOpen(true)}>
            Open
          </button>
          {open && (
            <Modal
              title="Title"
              onCancel={onCancel}
              footer={
                <button type="button" onClick={() => setOpen(false)}>
                  Done
                </button>
              }
            >
              Body
            </Modal>
          )}
        </>
      );
    }
    render(<Harness />);
    const opener = screen.getByRole('button', { name: 'Open' });
    opener.focus();
    fireEvent.click(opener);
    screen.getByRole('button', { name: 'Done' }).focus();
    fireEvent.click(screen.getByRole('button', { name: 'Done' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(opener).toHaveFocus();
    expect(onCancel).not.toHaveBeenCalled();
  });
});
