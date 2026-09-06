import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../../test/helpers';
import { SpoolVisualization } from './SpoolVisualization';

describe('SpoolVisualization', () => {
  it('renders the computed percentage, weight, and length', () => {
    renderWithProviders(
      <SpoolVisualization
        colorHex="#26272f"
        remainingWeightG={720}
        netWeightG={1000}
        totalLengthMm={331000}
      />,
    );

    expect(screen.getByText('72%')).toBeInTheDocument();
    expect(screen.getByText('720 g')).toBeInTheDocument();
    // 720/1000 * 331 = 238.32 -> rounds to 238
    expect(screen.getByText('238 m')).toBeInTheDocument();
  });

  it('omits the length stat when totalLengthMm is not provided', () => {
    renderWithProviders(
      <SpoolVisualization colorHex="#e8621d" remainingWeightG={310} netWeightG={1000} />,
    );

    expect(screen.getByText('31%')).toBeInTheDocument();
    expect(screen.queryByText(/m$/)).not.toBeInTheDocument();
  });

  it('converts weight and length stats to the given units', () => {
    renderWithProviders(
      <SpoolVisualization
        colorHex="#26272f"
        remainingWeightG={720}
        netWeightG={1000}
        totalLengthMm={331000}
        weightUnit="kg"
        lengthUnit="ft"
      />,
    );

    expect(screen.getByText('0.72 kg')).toBeInTheDocument();
    expect(screen.getByText('782 ft')).toBeInTheDocument();
  });
});
