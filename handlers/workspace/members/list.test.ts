jest.mock('../members-lookup.js', () => ({ listMembers: jest.fn() }));

import { Logger } from 'logger';
import { handler } from './list.js';
import { listMembers } from '../members-lookup.js';
import type { WorkspaceEvent } from '../index.js';

const mockListMembers = listMembers as jest.Mock;
const logger = new Logger('test');

function mockEvent(): WorkspaceEvent {
  return {
    pathParameters: { workspaceId: 'ws-1' },
    requestContext: { authorizer: { lambda: { userId: 'user-1', role: 'member' } } },
  } as unknown as WorkspaceEvent;
}

beforeEach(() => jest.clearAllMocks());

test('returns the member roster', async () => {
  mockListMembers.mockResolvedValue([{ userId: 'user-1', name: 'Ada', role: 'owner' }]);

  const result = await handler(mockEvent(), logger);

  expect(result.statusCode).toBe(200);
  expect(JSON.parse(result.body!)).toEqual({ members: [{ userId: 'user-1', name: 'Ada', role: 'owner' }] });
});

test('returns 500 when the lookup throws', async () => {
  mockListMembers.mockRejectedValue(new Error('ddb down'));

  const result = await handler(mockEvent(), logger);

  expect(result.statusCode).toBe(500);
});
