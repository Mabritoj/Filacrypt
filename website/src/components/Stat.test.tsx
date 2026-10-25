import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Stat } from './Stat';

describe('Stat', () => {
  it('renders the label and value', () => {
    render(<Stat label="Brands" value={3} />);
    expect(screen.getByText('Brands')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('renders a unit after the value', () => {
    render(<Stat label="Filament remaining" value="1910" unit="g" />);
    expect(screen.getByText('g').parentElement).toHaveTextContent('1910g');
  });

  it('puts the label first in the DOM regardless of position', () => {
    const { container } = render(<Stat label="Weight" value="720 g" labelPosition="bottom" />);
    expect(container.firstElementChild?.firstElementChild).toHaveTextContent('Weight');
  });
});
