import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../../test/helpers';
import { SpoolCard } from './SpoolCard';
import { mockSpools } from '../../api/mock/spools';

const spool = mockSpools[0];

describe('SpoolCard', () => {
  it('renders the spool name, brand, and material', () => {
    renderWithProviders(<SpoolCard spool={spool} lowStockThresholdG={100} />);

    expect(screen.getByText(spool.materialName)).toBeInTheDocument();
    expect(screen.getByText(spool.brand)).toBeInTheDocument();
    expect(screen.getByText(spool.materialType)).toBeInTheDocument();
  });

  it('is a link to the spool, named by what it opens', () => {
    renderWithProviders(<SpoolCard spool={spool} lowStockThresholdG={100} />);

    const link = screen.getByRole('link', { name: `${spool.materialName}, ${spool.brand}` });
    expect(link).toHaveAttribute('href', `/inventory/${spool.id}`);
  });

  it('shows remaining filament as a progress bar', () => {
    renderWithProviders(<SpoolCard spool={spool} lowStockThresholdG={100} />);

    const bar = screen.getByRole('progressbar', { name: 'Filament remaining' });
    expect(bar).toHaveAttribute('aria-valuenow', String(spool.remainingWeightG));
    expect(bar).toHaveAttribute('aria-valuemax', String(spool.netWeightG));
  });

  it('flags low stock with a badge and in the link name', () => {
    renderWithProviders(
      <SpoolCard spool={{ ...spool, remainingWeightG: 50 }} lowStockThresholdG={100} />,
    );

    expect(screen.getByText('Low')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /low stock/ })).toBeInTheDocument();
  });

  it('does not flag spools above the threshold', () => {
    renderWithProviders(
      <SpoolCard spool={{ ...spool, remainingWeightG: 500 }} lowStockThresholdG={100} />,
    );

    expect(screen.queryByText('Low')).not.toBeInTheDocument();
  });
});
