jest.mock('../members-lookup.js', () => ({ updateMemberPermissions: jest.fn() }));

import { Logger } from 'logger';
import { handler } from './permissions.js';
import { updateMemberPermissions } from '../members-lookup.js';
import type { WorkspaceEvent } from '../index.js';

const mockUpdateMemberPermissions = updateMemberPermissions as jest.Mock;
const logger = new Logger('test');

function mockEvent(body: unknown): WorkspaceEvent {
  return {
    pathParameters: { workspaceId: 'ws-1', userId: 'user-2' },
    requestContext: { authorizer: { lambda: { userId: 'user-1', role: 'admin' } } },
    body: JSON.stringify(body),
  } as unknown as WorkspaceEvent;
}

beforeEach(() => jest.clearAllMocks());

test('updates the specified permissions and returns the updated member', async () => {
  mockUpdateMemberPermissions.mockResolvedValue({ userId: 'user-2', role: 'member', filamentPermissions: { read: true } });

  const result = await handler(mockEvent({ filamentPermissions: { read: true } }), logger);

  expect(result.statusCode).toBe(200);
  expect(JSON.parse(result.body!)).toEqual({
    member: { userId: 'user-2', role: 'member', filamentPermissions: { read: true } },
  });
  expect(mockUpdateMemberPermissions).toHaveBeenCalledWith('ws-1', 'user-2', { read: true });
});

test('rejects a non-boolean permission value', async () => {
  const result = await handler(mockEvent({ filamentPermissions: { read: 'yes' } }), logger);

  expect(result.statusCode).toBe(400);
  expect(mockUpdateMemberPermissions).not.toHaveBeenCalled();
});

test('rejects an unrecognized permission key', async () => {
  const result = await handler(mockEvent({ filamentPermissions: { archive: true } }), logger);

  expect(result.statusCode).toBe(400);
});

test('returns 404 when the target is not a member', async () => {
  mockUpdateMemberPermissions.mockResolvedValue(null);

  const result = await handler(mockEvent({ filamentPermissions: { read: true } }), logger);

  expect(result.statusCode).toBe(404);
});
