import { describe, expect, it } from 'vitest';
import { mockSpools } from './spools';

describe('mockSpools', () => {
  it('contains the Galaxy Black reference spool with full detail', () => {
    const galaxyBlack = mockSpools.find((s) => s.id === 'spool-galaxy-black');
    expect(galaxyBlack).toBeDefined();
    expect(galaxyBlack?.brand).toBe('Prusament');
    expect(galaxyBlack?.materialType).toBe('PLA');
    expect(galaxyBlack?.tags).toContain('glitter');
    expect(galaxyBlack?.remainingWeightG).toBe(720);
    expect(galaxyBlack?.tag?.uid).toBe('E0:04:01:50:8A:3F:2C:11');
  });

  it('contains at least 3 spools, all belonging to workspace-1', () => {
    expect(mockSpools.length).toBeGreaterThanOrEqual(3);
    expect(mockSpools.every((s) => s.workspaceId === 'workspace-1')).toBe(true);
  });
});
