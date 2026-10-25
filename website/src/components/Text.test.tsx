import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Text } from './Text';

describe('Text', () => {
  it('renders its children as a paragraph by default', () => {
    render(<Text>Hello</Text>);
    expect(screen.getByText('Hello').tagName).toBe('P');
  });

  it('picks a heading element for heading variants', () => {
    render(<Text variant="h1">Inventory</Text>);
    expect(screen.getByRole('heading', { level: 1, name: 'Inventory' })).toBeInTheDocument();
  });

  it('renders as the element passed in `as`', () => {
    render(
      <Text variant="title" as="h2">
        Profile
      </Text>,
    );
    expect(screen.getByRole('heading', { level: 2, name: 'Profile' })).toBeInTheDocument();
  });

  it('passes element props through', () => {
    render(
      <Text as="label" htmlFor="email" variant="label">
        Email
      </Text>,
    );
    expect(screen.getByText('Email')).toHaveAttribute('for', 'email');
  });

  it('keeps label content in the case it was written', () => {
    render(<Text variant="label">Net weight</Text>);
    expect(screen.getByText('Net weight')).toBeInTheDocument();
  });

  it('merges a className', () => {
    render(<Text className="extra">Body</Text>);
    expect(screen.getByText('Body')).toHaveClass('extra');
  });
});
