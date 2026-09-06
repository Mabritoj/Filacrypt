import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SpoolCard } from './SpoolCard';
import { mockSpools } from '../../api/mock/spools';

const spool = mockSpools[0];

describe('SpoolCard', () => {
  it('renders the spool name, brand, and weight', () => {
    render(<SpoolCard spool={spool} lowStockThresholdG={100} onClick={vi.fn()} />);

    expect(screen.getByText(spool.materialName)).toBeInTheDocument();
    expect(screen.getByText(spool.brand)).toBeInTheDocument();
    expect(screen.getByText(spool.materialType)).toBeInTheDocument();
  });

  it('calls onClick when clicked', () => {
    const onClick = vi.fn();
    render(<SpoolCard spool={spool} lowStockThresholdG={100} onClick={onClick} />);

    fireEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('shows a LOW badge when remaining weight is under the threshold', () => {
    render(
      <SpoolCard
        spool={{ ...spool, remainingWeightG: 50 }}
        lowStockThresholdG={100}
        onClick={vi.fn()}
      />,
    );

    expect(screen.getByText('LOW')).toBeInTheDocument();
  });

  it('does not show a LOW badge when remaining weight is above the threshold', () => {
    render(
      <SpoolCard
        spool={{ ...spool, remainingWeightG: 500 }}
        lowStockThresholdG={100}
        onClick={vi.fn()}
      />,
    );

    expect(screen.queryByText('LOW')).not.toBeInTheDocument();
  });
});
