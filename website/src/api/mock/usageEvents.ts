import type { UsageEvent } from '../types';

export const mockUsageEvents: UsageEvent[] = [
  {
    id: 'usage-galaxy-black-1',
    spoolId: 'spool-galaxy-black',
    workspaceId: 'workspace-1',
    printJobName: 'Benchy calibration ×4',
    usedWeightG: 42,
    durationMin: 80,
    loggedBy: 'user-1',
    occurredAt: '2026-07-04T00:00:00.000Z',
  },
  {
    id: 'usage-galaxy-black-2',
    spoolId: 'spool-galaxy-black',
    workspaceId: 'workspace-1',
    printJobName: 'Enclosure bracket',
    usedWeightG: 118,
    durationMin: 185,
    loggedBy: 'user-1',
    occurredAt: '2026-07-02T00:00:00.000Z',
  },
  {
    id: 'usage-galaxy-black-3',
    spoolId: 'spool-galaxy-black',
    workspaceId: 'workspace-1',
    printJobName: 'Phone stand',
    usedWeightG: 36,
    durationMin: 52,
    loggedBy: 'user-1',
    occurredAt: '2026-06-28T00:00:00.000Z',
  },
  {
    id: 'usage-galaxy-black-4',
    spoolId: 'spool-galaxy-black',
    workspaceId: 'workspace-1',
    printJobName: 'Vase-mode planter',
    usedWeightG: 84,
    durationMin: 131,
    loggedBy: 'user-1',
    occurredAt: '2026-06-25T00:00:00.000Z',
  },
];
