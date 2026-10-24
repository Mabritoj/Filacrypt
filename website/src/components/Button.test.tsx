import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { renderWithProviders } from '../test/helpers';
import { Button } from './Button';

describe('Button', () => {
  it.each(['primary', 'secondary', 'destructive', 'ghost'] as const)(
    'renders the %s variant with its label',
    (variant) => {
      render(<Button variant={variant}>Click me</Button>);
      expect(screen.getByRole('button', { name: 'Click me' })).toBeInTheDocument();
    },
  );

  it('defaults to a primary type="button"', () => {
    render(<Button>Save</Button>);
    expect(screen.getByRole('button', { name: 'Save' })).toHaveAttribute('type', 'button');
  });

  it('renders an icon before the label', () => {
    render(<Button icon={<span data-testid="icon" />}>Switch to NFC</Button>);
    const button = screen.getByRole('button', { name: 'Switch to NFC' });
    expect(button.querySelector('[data-testid="icon"]')).toBeInTheDocument();
  });

  it('calls onClick when clicked, and does not when disabled', () => {
    const onClick = vi.fn();
    render(
      <Button onClick={onClick} disabled>
        Delete
      </Button>,
    );
    const button = screen.getByRole('button', { name: 'Delete' });
    expect(button).toBeDisabled();
    fireEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it('passes through the type attribute and an extra className', () => {
    render(
      <Button type="submit" className="custom-class">
        Submit
      </Button>,
    );
    const button = screen.getByRole('button', { name: 'Submit' });
    expect(button).toHaveAttribute('type', 'submit');
    expect(button).toHaveClass('custom-class');
  });

  describe('loading', () => {
    it('disables the button and marks it busy', () => {
      const onClick = vi.fn();
      render(
        <Button loading onClick={onClick}>
          Saving…
        </Button>,
      );
      const button = screen.getByRole('button', { name: 'Saving…' });
      expect(button).toBeDisabled();
      expect(button).toHaveAttribute('aria-busy', 'true');
      fireEvent.click(button);
      expect(onClick).not.toHaveBeenCalled();
    });

    it('replaces the icon with a spinner', () => {
      render(
        <Button loading icon={<span data-testid="icon" />}>
          Saving…
        </Button>,
      );
      const button = screen.getByRole('button', { name: 'Saving…' });
      expect(button.querySelector('[data-testid="icon"]')).not.toBeInTheDocument();
      expect(button.querySelector('svg')).toBeInTheDocument();
    });

    it('is neither busy nor disabled when not loading', () => {
      render(<Button loading={false}>Save</Button>);
      const button = screen.getByRole('button', { name: 'Save' });
      expect(button).toBeEnabled();
      expect(button).not.toHaveAttribute('aria-busy');
    });
  });

  describe('as a link', () => {
    it('renders a router link when given `to`', () => {
      renderWithProviders(<Button to="/inventory">View inventory</Button>);
      const link = screen.getByRole('link', { name: 'View inventory' });
      expect(link).toHaveAttribute('href', '/inventory');
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });

    it('renders a plain anchor when given `href`', () => {
      render(
        <Button href="#how" variant="secondary">
          See how it works
        </Button>,
      );
      expect(screen.getByRole('link', { name: 'See how it works' })).toHaveAttribute(
        'href',
        '#how',
      );
    });

    it('keeps the variant styling hooks on links', () => {
      render(
        <Button href="#how" className="extra">
          Go
        </Button>,
      );
      expect(screen.getByRole('link', { name: 'Go' })).toHaveClass('extra');
    });
  });

  it('rejects prop combinations that mix targets (compile-time)', () => {
    // These lines only need to fail type-checking; they're never rendered.
    const invalid = () => (
      <>
        {/* @ts-expect-error -- `to` and `href` are mutually exclusive */}
        <Button to="/a" href="/b">
          x
        </Button>
        {/* @ts-expect-error -- `loading` only exists on a real button */}
        <Button to="/a" loading>
          x
        </Button>
        {/* @ts-expect-error -- `danger` was renamed to `destructive` */}
        <Button variant="danger">x</Button>
      </>
    );
    expect(invalid).toBeTypeOf('function');
  });
});
