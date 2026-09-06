import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FilterPanel } from './FilterPanel';
import type { FilterPanelProps } from './FilterPanel';

function renderFilterPanel(overrides: Partial<FilterPanelProps> = {}) {
  const props: FilterPanelProps = {
    availableMaterialTypes: ['PLA', 'PETG'],
    availableTags: ['matte', 'glitter'],
    availableColors: ['#26272f', '#ffffff'],
    availableBrands: ['Prusament', 'eSun'],
    materialTypes: [],
    tags: [],
    colors: [],
    brand: null,
    lowStockOnly: false,
    onToggleMaterialType: vi.fn(),
    onToggleTag: vi.fn(),
    onToggleColor: vi.fn(),
    onSetBrand: vi.fn(),
    onToggleLowStockOnly: vi.fn(),
    onReset: vi.fn(),
    onClose: vi.fn(),
    ...overrides,
  };
  render(<FilterPanel {...props} />);
  return props;
}

describe('FilterPanel', () => {
  it('renders the available material types, tags, colors, and brands', () => {
    renderFilterPanel();

    expect(screen.getByRole('button', { name: 'PLA' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'PETG' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Matte' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Prusament' })).toBeInTheDocument();
  });

  it('calls onToggleMaterialType when a material chip is clicked', () => {
    const props = renderFilterPanel();

    fireEvent.click(screen.getByRole('button', { name: 'PLA' }));
    expect(props.onToggleMaterialType).toHaveBeenCalledWith('PLA');
  });

  it('calls onReset when Reset is clicked', () => {
    const props = renderFilterPanel();

    fireEvent.click(screen.getByRole('button', { name: 'Reset' }));
    expect(props.onReset).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when Apply filters or Close is clicked', () => {
    const props = renderFilterPanel();

    fireEvent.click(screen.getByRole('button', { name: 'Apply filters' }));
    expect(props.onClose).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(props.onClose).toHaveBeenCalledTimes(2);
  });

  it('marks the active material type as pressed', () => {
    renderFilterPanel({ materialTypes: ['PLA'] });

    expect(screen.getByRole('button', { name: 'PLA' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'PETG' })).toHaveAttribute('aria-pressed', 'false');
  });
});
