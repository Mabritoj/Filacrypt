import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { renderWithProviders } from '../test/helpers';
import { IconButton } from './IconButton';
import { CloseIcon, GearIcon } from './icons';

describe('IconButton', () => {
  it('renders a button named by its label', () => {
    const onClick = vi.fn();
    render(<IconButton label="Close chat" icon={<CloseIcon />} onClick={onClick} />);
    const button = screen.getByRole('button', { name: 'Close chat' });
    expect(button).toHaveAttribute('type', 'button');
    fireEvent.click(button);
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('hides the icon from assistive tech', () => {
    render(<IconButton label="Close" icon={<CloseIcon />} />);
    expect(screen.getByRole('button', { name: 'Close' }).querySelector('svg')).toHaveAttribute(
      'aria-hidden',
      'true',
    );
  });

  it('renders a router link when given `to`', () => {
    renderWithProviders(
      <IconButton to="/account" label="Account settings" icon={<GearIcon />} size="sm" />,
    );
    expect(screen.getByRole('link', { name: 'Account settings' })).toHaveAttribute(
      'href',
      '/account',
    );
  });

  it('passes ARIA state through, e.g. for a menu trigger', () => {
    render(<IconButton label="Spool options" icon={<CloseIcon />} aria-expanded={false} />);
    expect(screen.getByRole('button', { name: 'Spool options' })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
  });

  it('requires a label (compile-time)', () => {
    // @ts-expect-error -- an icon-only control must have an accessible name
    const invalid = () => <IconButton icon={<CloseIcon />} />;
    expect(invalid).toBeTypeOf('function');
  });
});
