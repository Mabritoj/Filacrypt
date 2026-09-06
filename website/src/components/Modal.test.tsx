import { describe, expect, it, vi } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { renderWithProviders } from '../test/helpers';
import { Modal } from './Modal';

describe('Modal', () => {
  it('renders the title and children', () => {
    renderWithProviders(
      <Modal title="Delete this spool?" onCancel={vi.fn()}>
        <p>This can&apos;t be undone.</p>
      </Modal>,
    );

    expect(screen.getByRole('heading', { name: 'Delete this spool?' })).toBeInTheDocument();
    expect(screen.getByText("This can't be undone.")).toBeInTheDocument();
  });

  it('does not call onCancel when the backdrop is clicked', () => {
    const onCancel = vi.fn();
    renderWithProviders(
      <Modal title="Delete this spool?" onCancel={onCancel}>
        <p>Body</p>
      </Modal>,
    );

    fireEvent.click(screen.getByTestId('modal-backdrop'));

    expect(onCancel).not.toHaveBeenCalled();
  });

  it('does not call onCancel when Escape is pressed', () => {
    const onCancel = vi.fn();
    renderWithProviders(
      <Modal title="Delete this spool?" onCancel={onCancel}>
        <p>Body</p>
      </Modal>,
    );

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(onCancel).not.toHaveBeenCalled();
  });

  it('only calls onCancel when a control inside the modal explicitly calls it', () => {
    const onCancel = vi.fn();
    renderWithProviders(
      <Modal title="Delete this spool?" onCancel={onCancel}>
        <button type="button" onClick={onCancel}>
          Cancel
        </button>
      </Modal>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
