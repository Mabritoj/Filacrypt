import { describe, expect, it, vi } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import { renderWithProviders } from '../test/helpers';
import { Menu, MenuGroup, MenuItem } from './Menu';

function renderMenu({ onEdit = vi.fn(), onToggle = vi.fn() } = {}) {
  renderWithProviders(
    <>
      <Menu
        label="Spool options"
        trigger={(props) => (
          <button type="button" {...props}>
            Options
          </button>
        )}
      >
        <MenuGroup>
          <MenuItem onClick={onEdit}>Edit spool</MenuItem>
          <MenuItem to="/scan">Add spool</MenuItem>
          <MenuItem checked={false} onClick={onToggle}>
            Dark mode
          </MenuItem>
        </MenuGroup>
        <MenuGroup>
          <MenuItem tone="destructive">Delete spool</MenuItem>
        </MenuGroup>
      </Menu>
      <button type="button">After</button>
    </>,
  );
  return { trigger: screen.getByRole('button', { name: 'Options' }), onEdit, onToggle };
}

const item = (name: string) => screen.getByRole('menuitem', { name });

describe('Menu', () => {
  it('is closed until its trigger is clicked', () => {
    const { trigger } = renderMenu();
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(trigger).toHaveAttribute('aria-haspopup', 'menu');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(trigger);
    const menu = screen.getByRole('menu', { name: 'Spool options' });
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(trigger).toHaveAttribute('aria-controls', menu.id);
  });

  it('focuses the first item on open and moves with the arrow keys, wrapping', () => {
    const { trigger } = renderMenu();
    fireEvent.click(trigger);
    expect(item('Edit spool')).toHaveFocus();

    fireEvent.keyDown(item('Edit spool'), { key: 'ArrowDown' });
    expect(item('Add spool')).toHaveFocus();
    fireEvent.keyDown(item('Add spool'), { key: 'End' });
    expect(item('Delete spool')).toHaveFocus();
    fireEvent.keyDown(item('Delete spool'), { key: 'ArrowDown' });
    expect(item('Edit spool')).toHaveFocus();
    fireEvent.keyDown(item('Edit spool'), { key: 'ArrowUp' });
    expect(item('Delete spool')).toHaveFocus();
    fireEvent.keyDown(item('Delete spool'), { key: 'Home' });
    expect(item('Edit spool')).toHaveFocus();
  });

  it('opens on ArrowUp from the trigger with the last item focused', () => {
    const { trigger } = renderMenu();
    fireEvent.keyDown(trigger, { key: 'ArrowUp' });
    expect(item('Delete spool')).toHaveFocus();
  });

  it('closes on Escape and returns focus to the trigger', () => {
    const { trigger } = renderMenu();
    fireEvent.click(trigger);
    fireEvent.keyDown(item('Edit spool'), { key: 'Escape' });
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it('closes on Tab, leaving focus on the trigger for the browser to move on from', () => {
    const { trigger } = renderMenu();
    fireEvent.click(trigger);
    fireEvent.keyDown(item('Edit spool'), { key: 'Tab' });
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it('runs an item and closes, refocusing the trigger', () => {
    const { trigger, onEdit } = renderMenu();
    fireEvent.click(trigger);
    fireEvent.click(item('Edit spool'));
    expect(onEdit).toHaveBeenCalledOnce();
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it('renders link items', () => {
    const { trigger } = renderMenu();
    fireEvent.click(trigger);
    expect(item('Add spool')).toHaveAttribute('href', '/scan');
  });

  it('keeps the menu open for checkbox items', () => {
    const { trigger, onToggle } = renderMenu();
    fireEvent.click(trigger);
    const toggle = screen.getByRole('menuitemcheckbox', { name: 'Dark mode' });
    expect(toggle).toHaveAttribute('aria-checked', 'false');
    fireEvent.click(toggle);
    expect(onToggle).toHaveBeenCalledOnce();
    expect(screen.getByRole('menu')).toBeInTheDocument();
  });

  it('closes on a click outside', () => {
    const { trigger } = renderMenu();
    fireEvent.click(trigger);
    fireEvent.pointerDown(screen.getByRole('button', { name: 'After' }));
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('keeps items out of the page tab order', () => {
    const { trigger } = renderMenu();
    fireEvent.click(trigger);
    expect(item('Edit spool')).toHaveAttribute('tabindex', '-1');
  });
});
