import type { Workspace } from '../types';

export const mockWorkspace: Workspace = {
  id: 'workspace-1',
  name: 'My Workspace',
  ownerId: 'user-1',
  lowStockThresholdG: 200,
  defaultDiameterMm: 1.75,
  defaultEmptySpoolWeightG: 215,
  createdAt: '2025-01-01T00:00:00.000Z',
  callerRole: 'owner',
  callerFilamentPermissions: undefined,
};
