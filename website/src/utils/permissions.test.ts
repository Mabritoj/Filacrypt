import { describe, expect, it } from 'vitest';
import { canFilament } from './permissions';
import type { Workspace } from '../api/types';

function workspace(overrides: Partial<Workspace>): Workspace {
  return {
    id: 'ws-1',
    name: 'My Workspace',
    ownerId: 'user-1',
    lowStockThresholdG: 200,
    defaultDiameterMm: 1.75,
    defaultEmptySpoolWeightG: 215,
    createdAt: '2026-01-01T00:00:00.000Z',
    callerRole: 'member',
    ...overrides,
  };
}

describe('canFilament', () => {
  it('grants every action to an owner, regardless of granted permissions', () => {
    expect(canFilament(workspace({ callerRole: 'owner' }), 'create')).toBe(true);
    expect(canFilament(workspace({ callerRole: 'owner' }), 'delete')).toBe(true);
  });

  it('grants every action to an admin', () => {
    expect(canFilament(workspace({ callerRole: 'admin' }), 'update')).toBe(true);
  });

  it('grants a member only the actions explicitly permitted', () => {
    const ws = workspace({
      callerRole: 'member',
      callerFilamentPermissions: { create: true, read: true, update: false, delete: false },
    });
    expect(canFilament(ws, 'create')).toBe(true);
    expect(canFilament(ws, 'update')).toBe(false);
  });

  it('denies a member with no granted permissions at all', () => {
    expect(canFilament(workspace({ callerRole: 'member' }), 'create')).toBe(false);
  });

  it('denies everything when the workspace has not loaded yet', () => {
    expect(canFilament(undefined, 'create')).toBe(false);
  });
});
