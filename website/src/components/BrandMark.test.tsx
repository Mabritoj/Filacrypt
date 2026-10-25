import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { BrandMark } from './BrandMark';

describe('BrandMark', () => {
  it('renders a decorative mark', () => {
    const { container } = render(<BrandMark />);
    const mark = container.firstElementChild;
    expect(mark).toHaveTextContent('F');
    expect(mark).toHaveAttribute('aria-hidden', 'true');
  });

  it('merges a className', () => {
    const { container } = render(<BrandMark size="sm" className="extra" />);
    expect(container.firstElementChild).toHaveClass('extra');
  });
});
