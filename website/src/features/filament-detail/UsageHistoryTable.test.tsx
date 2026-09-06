import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../../test/helpers';
import { UsageHistoryTable } from './UsageHistoryTable';
import { mockUsageEvents } from '../../api/mock/usageEvents';

describe('UsageHistoryTable', () => {
  it('renders each event and the total used summary', () => {
    renderWithProviders(<UsageHistoryTable events={mockUsageEvents} />);

    expect(screen.getByText('Benchy calibration ×4')).toBeInTheDocument();
    expect(screen.getByText('Enclosure bracket')).toBeInTheDocument();
    // 42 + 118 + 36 + 84 = 280
    expect(screen.getByText('280 g used across 4 prints')).toBeInTheDocument();
  });

  it('shows an empty state with no events', () => {
    renderWithProviders(<UsageHistoryTable events={[]} />);
    expect(screen.getByText('No print jobs logged for this spool yet.')).toBeInTheDocument();
  });
});
