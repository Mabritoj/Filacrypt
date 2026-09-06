import { describe, expect, it, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { useDismissablePanel } from './useDismissablePanel';

function TestPanel({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const ref = useDismissablePanel<HTMLDivElement>(isOpen, onClose);
  return (
    <div>
      <button type="button">Outside</button>
      <div ref={ref} data-testid="panel">
        <button type="button">Inside</button>
      </div>
    </div>
  );
}

describe('useDismissablePanel', () => {
  it('calls onClose when clicking outside the panel', () => {
    const onClose = vi.fn();
    const { getByText } = render(<TestPanel isOpen onClose={onClose} />);

    fireEvent.mouseDown(getByText('Outside'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does not call onClose when clicking inside the panel', () => {
    const onClose = vi.fn();
    const { getByText } = render(<TestPanel isOpen onClose={onClose} />);

    fireEvent.mouseDown(getByText('Inside'));
    expect(onClose).not.toHaveBeenCalled();
  });

  it('calls onClose when Escape is pressed', () => {
    const onClose = vi.fn();
    render(<TestPanel isOpen onClose={onClose} />);

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does nothing while closed', () => {
    const onClose = vi.fn();
    const { getByText } = render(<TestPanel isOpen={false} onClose={onClose} />);

    fireEvent.mouseDown(getByText('Outside'));
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).not.toHaveBeenCalled();
  });
});
