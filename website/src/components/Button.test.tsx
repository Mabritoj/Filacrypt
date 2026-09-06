import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from './Button';

describe('Button', () => {
  it.each(['primary', 'secondary', 'danger', 'ghost'] as const)(
    'renders the %s variant with its label',
    (variant) => {
      render(<Button variant={variant}>Click me</Button>);
      expect(screen.getByRole('button', { name: 'Click me' })).toBeInTheDocument();
    },
  );

  it('defaults to the primary variant when none is given', () => {
    render(<Button>Save</Button>);
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
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
});
