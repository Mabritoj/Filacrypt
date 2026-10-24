import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { Popover } from './Popover';

function Harness() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Popover
        open={open}
        onOpenChange={setOpen}
        label="Filters"
        trigger={(props) => (
          <button type="button" {...props}>
            Filters
          </button>
        )}
      >
        <button type="button" onClick={() => setOpen(false)}>
          Apply filters
        </button>
      </Popover>
      <input aria-label="Search" />
    </>
  );
}

const trigger = () => screen.getByRole('button', { name: 'Filters' });

describe('Popover', () => {
  it('toggles a labelled dialog from its trigger', () => {
    render(<Harness />);
    expect(trigger()).toHaveAttribute('aria-haspopup', 'dialog');
    expect(trigger()).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(trigger());
    const panel = screen.getByRole('dialog', { name: 'Filters' });
    expect(trigger()).toHaveAttribute('aria-expanded', 'true');
    expect(trigger()).toHaveAttribute('aria-controls', panel.id);

    fireEvent.click(trigger());
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('moves focus into the panel when it opens', () => {
    render(<Harness />);
    fireEvent.click(trigger());
    expect(screen.getByRole('dialog')).toHaveFocus();
  });

  it('closes on Escape and returns focus to the trigger', () => {
    render(<Harness />);
    fireEvent.click(trigger());
    fireEvent.keyDown(screen.getByRole('button', { name: 'Apply filters' }), { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(trigger()).toHaveFocus();
  });

  it('returns focus to the trigger when closed from inside', () => {
    render(<Harness />);
    fireEvent.click(trigger());
    const apply = screen.getByRole('button', { name: 'Apply filters' });
    apply.focus();
    fireEvent.click(apply);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(trigger()).toHaveFocus();
  });

  it('closes on a press outside without stealing focus from where it went', () => {
    render(<Harness />);
    fireEvent.click(trigger());
    const search = screen.getByRole('textbox', { name: 'Search' });
    fireEvent.pointerDown(search);
    search.focus();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(search).toHaveFocus();
  });
});
