jest.mock('../members-lookup.js', () => ({ updateMemberRole: jest.fn() }));
jest.mock('workspace-auth', () => ({ getMember: jest.fn() }));

import { Logger } from 'logger';
import { handler } from './role.js';
import { updateMemberRole } from '../members-lookup.js';
import { getMember } from 'workspace-auth';
import type { WorkspaceEvent } from '../index.js';

const mockUpdateMemberRole = updateMemberRole as jest.Mock;
const mockGetMember = getMember as jest.Mock;
const logger = new Logger('test');

function mockEvent(body: unknown): WorkspaceEvent {
  return {
    pathParameters: { workspaceId: 'ws-1', userId: 'user-2' },
    requestContext: { authorizer: { lambda: { userId: 'user-1', role: 'owner' } } },
    body: JSON.stringify(body),
  } as unknown as WorkspaceEvent;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockGetMember.mockResolvedValue({ role: 'member' });
});

test('updates the role and returns the updated member', async () => {
  mockUpdateMemberRole.mockResolvedValue({ userId: 'user-2', role: 'admin' });

  const result = await handler(mockEvent({ role: 'admin' }), logger);

  expect(result.statusCode).toBe(200);
  expect(JSON.parse(result.body!)).toEqual({ member: { userId: 'user-2', role: 'admin' } });
  expect(mockUpdateMemberRole).toHaveBeenCalledWith('ws-1', 'user-2', 'admin');
});

test('rejects role "owner" as an invalid value', async () => {
  const result = await handler(mockEvent({ role: 'owner' }), logger);

  expect(result.statusCode).toBe(400);
  expect(mockUpdateMemberRole).not.toHaveBeenCalled();
});

test('rejects an unrecognized role string', async () => {
  const result = await handler(mockEvent({ role: 'superadmin' }), logger);

  expect(result.statusCode).toBe(400);
});

test('returns 404 when the target is not a member', async () => {
  mockUpdateMemberRole.mockResolvedValue(null);

  const result = await handler(mockEvent({ role: 'member' }), logger);

  expect(result.statusCode).toBe(404);
});

test('rejects changing the workspace owner\'s own role, orphaning the workspace', async () => {
  mockGetMember.mockResolvedValue({ role: 'owner' });

  const result = await handler(mockEvent({ role: 'member' }), logger);

  expect(result.statusCode).toBe(400);
  expect(mockUpdateMemberRole).not.toHaveBeenCalled();
});
