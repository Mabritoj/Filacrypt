import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import {
  ChevronLeftIcon,
  CloseIcon,
  GearIcon,
  MoreIcon,
  NfcIcon,
  SpoolIcon,
  SwapIcon,
} from './icons';

const ICONS = { ChevronLeftIcon, CloseIcon, GearIcon, MoreIcon, NfcIcon, SpoolIcon, SwapIcon };

describe('icons', () => {
  it.each(Object.entries(ICONS))('%s is decorative by default', (_, Icon) => {
    const { container } = render(<Icon />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('aria-hidden', 'true');
    expect(svg).toHaveAttribute('width', '16');
  });

  it('becomes an image named by its title', () => {
    render(<NfcIcon title="NFC tag" size={22} />);
    const icon = screen.getByRole('img', { name: 'NFC tag' });
    expect(icon).not.toHaveAttribute('aria-hidden');
    expect(icon).toHaveAttribute('width', '22');
  });

  it('passes SVG props through', () => {
    const { container } = render(<SpoolIcon className="spin" />);
    expect(container.querySelector('svg')).toHaveClass('spin');
  });
});
