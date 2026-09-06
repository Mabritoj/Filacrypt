import { describe, expect, it } from 'vitest';
import { mockUsageEvents } from './usageEvents';

describe('mockUsageEvents', () => {
  it('contains the Galaxy Black print history from the mockup', () => {
    expect(mockUsageEvents).toHaveLength(4);
    expect(mockUsageEvents.every((event) => event.spoolId === 'spool-galaxy-black')).toBe(true);
    expect(mockUsageEvents[0].printJobName).toBe('Benchy calibration ×4');
    expect(mockUsageEvents[0].usedWeightG).toBe(42);
  });
});
