import { describe, expect, it } from 'vitest';
import { mockWorkspace } from './workspace';

describe('mockWorkspace', () => {
  it('matches the Account Settings mockup defaults', () => {
    expect(mockWorkspace.id).toBe('workspace-1');
    expect(mockWorkspace.lowStockThresholdG).toBe(200);
    expect(mockWorkspace.defaultDiameterMm).toBe(1.75);
    expect(mockWorkspace.defaultEmptySpoolWeightG).toBe(215);
  });
});
