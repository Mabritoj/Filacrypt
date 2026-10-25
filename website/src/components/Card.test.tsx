import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { Link } from 'react-router-dom';
import { renderWithProviders } from '../test/helpers';
import { Card } from './Card';

describe('Card', () => {
  it('renders its children in a div by default', () => {
    render(<Card>Contents</Card>);
    expect(screen.getByText('Contents').tagName).toBe('DIV');
  });

  it('renders as the element passed in `as`', () => {
    render(
      <Card as="section" aria-label="Profile">
        Contents
      </Card>,
    );
    expect(screen.getByRole('region', { name: 'Profile' })).toHaveTextContent('Contents');
  });

  it('renders as a router link, typed with Link props', () => {
    renderWithProviders(
      <Card as={Link} to="/inventory/spool-1" interactive>
        Galaxy Black
      </Card>,
    );
    expect(screen.getByRole('link', { name: 'Galaxy Black' })).toHaveAttribute(
      'href',
      '/inventory/spool-1',
    );
  });

  it('renders as a button that handles clicks', () => {
    const onClick = vi.fn();
    render(
      <Card as="button" type="button" interactive onClick={onClick}>
        Pick me
      </Card>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Pick me' }));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('merges a className', () => {
    render(<Card className="extra">Contents</Card>);
    expect(screen.getByText('Contents')).toHaveClass('extra');
  });

  it('types props from the `as` element (compile-time)', () => {
    const invalid = () => (
      <>
        {/* @ts-expect-error -- a div has no `to` */}
        <Card to="/x">x</Card>
        {/* @ts-expect-error -- Link requires `to` */}
        <Card as={Link}>x</Card>
      </>
    );
    expect(invalid).toBeTypeOf('function');
  });
});
