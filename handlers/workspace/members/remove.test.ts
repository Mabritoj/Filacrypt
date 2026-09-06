jest.mock('../members-lookup.js', () => ({ removeMember: jest.fn() }));

import { Logger } from 'logger';
import { handler } from './remove.js';
import { removeMember } from '../members-lookup.js';
import type { WorkspaceEvent } from '../index.js';

const mockRemoveMember = removeMember as jest.Mock;
const logger = new Logger('test');

function mockEvent(): WorkspaceEvent {
  return {
    pathParameters: { workspaceId: 'ws-1', userId: 'user-2' },
    requestContext: { authorizer: { lambda: { userId: 'user-1', role: 'owner' } } },
  } as unknown as WorkspaceEvent;
}

beforeEach(() => jest.clearAllMocks());

test('removes the member and returns 204', async () => {
  mockRemoveMember.mockResolvedValue(true);

  const result = await handler(mockEvent(), logger);

  expect(result.statusCode).toBe(204);
  expect(mockRemoveMember).toHaveBeenCalledWith('ws-1', 'user-2');
});

test('returns 404 when the target is not a member', async () => {
  mockRemoveMember.mockResolvedValue(false);

  const result = await handler(mockEvent(), logger);

  expect(result.statusCode).toBe(404);
});
