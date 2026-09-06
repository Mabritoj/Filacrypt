import { describe, expect, it } from 'vitest';
import type { Printer, Spool, User, UsageEvent, Workspace, WorkspaceMembership } from './index';

describe('domain types', () => {
  it('accepts a realistic Spool', () => {
    const spool: Spool = {
      id: 'spool-galaxy-black',
      workspaceId: 'workspace-1',
      brand: 'Prusament',
      materialType: 'PLA',
      materialName: 'Galaxy Black',
      tags: ['glitter'],
      colorHex: '#26272f',
      netWeightG: 1000,
      remainingWeightG: 720,
      filamentDiameterMm: 1.75,
      minNozzleTempC: 205,
      maxNozzleTempC: 225,
      status: 'in_use',
      addedBy: 'user-1',
      createdAt: '2025-11-20T00:00:00.000Z',
      updatedAt: '2026-07-04T00:00:00.000Z',
      tag: {
        uid: 'E0:04:01:50:8A:3F:2C:11',
        standard: 'NFC-V (ISO 15693) · ICODE SLIX2',
        writeProtection: 'no',
        healthy: true,
        memoryUsedBytes: 168,
        memoryTotalBytes: 316,
      },
    };

    expect(spool.materialType).toBe('PLA');
    expect(spool.tags).toContain('glitter');
    expect(spool.tag?.writeProtection).toBe('no');
  });

  it('accepts a realistic Printer, UsageEvent, User, Workspace, and WorkspaceMembership', () => {
    const printer: Printer = {
      id: 'printer-bench-02',
      workspaceId: 'workspace-1',
      name: 'Bench-02',
      model: 'Prusa MK4S',
      createdAt: '2025-01-01T00:00:00.000Z',
      updatedAt: '2025-01-01T00:00:00.000Z',
    };

    const usageEvent: UsageEvent = {
      id: 'usage-1',
      spoolId: 'spool-galaxy-black',
      workspaceId: 'workspace-1',
      printJobName: 'Benchy calibration ×4',
      usedWeightG: 42,
      durationMin: 80,
      loggedBy: 'user-1',
      occurredAt: '2026-07-04T00:00:00.000Z',
    };

    const user: User = {
      id: 'user-1',
      name: 'Morgan Reyes',
      username: 'morgan',
      email: 'morgan@filacrypt.com',
      emailVerified: true,
      preferences: {
        weightUnit: 'g',
        temperatureUnit: 'C',
        lengthUnit: 'm',
        currency: 'USD',
        theme: 'dark',
        defaultEntryMode: 'nfc',
      },
      createdAt: '2025-01-01T00:00:00.000Z',
    };

    const workspace: Workspace = {
      id: 'workspace-1',
      name: 'My Workspace',
      ownerId: 'user-1',
      lowStockThresholdG: 200,
      defaultDiameterMm: 1.75,
      defaultEmptySpoolWeightG: 215,
      createdAt: '2025-01-01T00:00:00.000Z',
      callerRole: 'owner',
    };

    const membership: WorkspaceMembership = {
      workspaceId: 'workspace-1',
      userId: 'user-1',
      role: 'owner',
      joinedAt: '2025-01-01T00:00:00.000Z',
    };

    expect(printer.model).toBe('Prusa MK4S');
    expect(usageEvent.usedWeightG).toBe(42);
    expect(user.preferences.theme).toBe('dark');
    expect(workspace.lowStockThresholdG).toBe(200);
    expect(membership.role).toBe('owner');
  });
});
