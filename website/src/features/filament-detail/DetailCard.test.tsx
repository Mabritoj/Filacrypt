import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../../test/helpers';
import { DetailCard } from './DetailCard';

describe('DetailCard', () => {
  it('renders the title and every row label/value', () => {
    renderWithProviders(
      <DetailCard
        title="PHYSICAL"
        rows={[
          { label: 'Diameter', value: '1.75 mm' },
          { label: 'Density', value: '1.24 g/cm³' },
        ]}
      />,
    );

    expect(screen.getByText('PHYSICAL')).toBeInTheDocument();
    expect(screen.getByText('Diameter')).toBeInTheDocument();
    expect(screen.getByText('1.75 mm')).toBeInTheDocument();
    expect(screen.getByText('Density')).toBeInTheDocument();
    expect(screen.getByText('1.24 g/cm³')).toBeInTheDocument();
  });
});
