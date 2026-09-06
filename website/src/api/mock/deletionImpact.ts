import type { DeletionImpactWorkspace } from '../user';

export const mockDeletionImpact: DeletionImpactWorkspace[] = [
  {
    workspaceId: 'ws-2',
    name: "Grace's Garage",
    members: [
      { userId: 'user-2', name: 'Grace Hopper', role: 'admin' },
      { userId: 'user-3', name: 'Hedy Lamarr', role: 'member' },
    ],
  },
];
