import { Logger } from 'logger';

jest.mock('./workspace-lookup.js', () => ({
  getWorkspace: jest.fn(),
  updateWorkspace: jest.fn(),
}));
jest.mock('workspace-auth', () => ({ getMember: jest.fn() }));

import { handler } from './workspace.js';
import type { WorkspaceEvent } from './index.js';
import { getWorkspace, updateWorkspace } from './workspace-lookup.js';
import { getMember } from 'workspace-auth';

const mockLogger = new Logger('test-correlation-id');
const mockGetWorkspace = getWorkspace as jest.Mock;
const mockUpdateWorkspace = updateWorkspace as jest.Mock;
const mockGetMember = getMember as jest.Mock;

function mockEvent(
  method: string,
  workspaceId: string,
  body?: unknown,
  role = 'owner',
): WorkspaceEvent {
  return {
    requestContext: {
      http: { method },
      authorizer: { lambda: { userId: 'user-1', role } },
    },
    pathParameters: { workspaceId },
    body: body ? JSON.stringify(body) : undefined,
  } as unknown as WorkspaceEvent;
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, 'log').mockImplementation(() => {});
});

afterEach(() => jest.restoreAllMocks());

test('GET returns 404 when the workspace does not exist', async () => {
  mockGetWorkspace.mockResolvedValue(null);

  const result = await handler(mockEvent('GET', 'ws-1'), mockLogger);

  expect(result.statusCode).toBe(404);
});

test('GET returns the workspace on success', async () => {
  mockGetWorkspace.mockResolvedValue({ id: 'ws-1', name: 'My Workspace' });
  mockGetMember.mockResolvedValue(undefined);

  const result = await handler(mockEvent('GET', 'ws-1'), mockLogger);

  expect(result.statusCode).toBe(200);
  expect(JSON.parse(result.body as string)).toEqual({
    workspace: { id: 'ws-1', name: 'My Workspace', callerRole: 'owner' },
  });
});

test('GET includes callerRole and callerFilamentPermissions from the authorizer context and member lookup', async () => {
  mockGetWorkspace.mockResolvedValue({ id: 'ws-1', name: 'Shop' });
  mockGetMember.mockResolvedValue({ role: 'member', filamentPermissions: { create: false, read: true, update: false, delete: false } });

  const result = await handler(mockEvent('GET', 'ws-1'), mockLogger);

  const body = JSON.parse(result.body!);
  expect(body.workspace.callerRole).toBe('owner'); // from the authorizer context in mockEvent(), not from getMember
  expect(body.workspace.callerFilamentPermissions).toEqual({ create: false, read: true, update: false, delete: false });
});

test('PATCH forwards only the allowed fields and returns the updated workspace', async () => {
  mockUpdateWorkspace.mockResolvedValue({ id: 'ws-1', lowStockThresholdG: 100 });

  const result = await handler(
    mockEvent('PATCH', 'ws-1', { lowStockThresholdG: 100, notAllowed: 'x' }),
    mockLogger,
  );

  expect(result.statusCode).toBe(200);
  expect(mockUpdateWorkspace).toHaveBeenCalledWith('ws-1', { lowStockThresholdG: 100 });
});

test('PATCH includes callerRole and callerFilamentPermissions in the response, like GET does', async () => {
  mockUpdateWorkspace.mockResolvedValue({ id: 'ws-1', lowStockThresholdG: 100 });
  mockGetMember.mockResolvedValue({ role: 'owner', filamentPermissions: undefined });

  const result = await handler(
    mockEvent('PATCH', 'ws-1', { lowStockThresholdG: 100 }, 'owner'),
    mockLogger,
  );

  const body = JSON.parse(result.body!);
  expect(body.workspace).toEqual({
    id: 'ws-1',
    lowStockThresholdG: 100,
    callerRole: 'owner',
    callerFilamentPermissions: undefined,
  });
});

test('PATCH returns 404 when the workspace does not exist', async () => {
  mockUpdateWorkspace.mockResolvedValue(null);

  const result = await handler(mockEvent('PATCH', 'ws-1', { lowStockThresholdG: 100 }), mockLogger);

  expect(result.statusCode).toBe(404);
});

test('PATCH returns 400 and does not call updateWorkspace when a field has the wrong type', async () => {
  const result = await handler(
    mockEvent('PATCH', 'ws-1', { lowStockThresholdG: 'not-a-number' }),
    mockLogger,
  );

  expect(result.statusCode).toBe(400);
  expect(JSON.parse(result.body as string)).toEqual({
    error: { code: 'VALIDATION_ERROR', message: 'lowStockThresholdG must be a number' },
  });
  expect(mockUpdateWorkspace).not.toHaveBeenCalled();
});

test('returns 405 for an unsupported method', async () => {
  const result = await handler(mockEvent('DELETE', 'ws-1'), mockLogger);

  expect(result.statusCode).toBe(405);
});
