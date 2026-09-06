import type { WorkspaceMember } from '../types';

export const mockMembers: WorkspaceMember[] = [
  {
    userId: 'user-1',
    name: 'Ada Lovelace',
    email: 'ada@example.com',
    role: 'owner',
    joinedAt: '2025-01-01T00:00:00.000Z',
  },
  {
    userId: 'user-2',
    name: 'Grace Hopper',
    email: 'grace@example.com',
    role: 'admin',
    joinedAt: '2025-02-10T00:00:00.000Z',
  },
  {
    userId: 'user-3',
    name: 'Hedy Lamarr',
    email: 'hedy@example.com',
    role: 'member',
    filamentPermissions: { create: false, read: true, update: false, delete: false },
    joinedAt: '2025-03-15T00:00:00.000Z',
  },
];
