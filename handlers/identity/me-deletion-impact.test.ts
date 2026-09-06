jest.mock('./lookup.js', () => ({ getDeletionImpact: jest.fn() }));

import { APIGatewayProxyEventV2WithJWTAuthorizer } from 'aws-lambda';
import { Logger } from 'logger';
import { handler } from './me-deletion-impact.js';
import { getDeletionImpact } from './lookup.js';

const mockGetDeletionImpact = getDeletionImpact as jest.Mock;
const logger = new Logger('test');

function mockEvent(): APIGatewayProxyEventV2WithJWTAuthorizer {
  return {
    requestContext: { authorizer: { jwt: { claims: { sub: 'user-1' }, scopes: null } } },
  } as unknown as APIGatewayProxyEventV2WithJWTAuthorizer;
}

beforeEach(() => jest.clearAllMocks());

test('returns the workspaces needing a resolution', async () => {
  mockGetDeletionImpact.mockResolvedValue([
    { workspaceId: 'ws-1', name: 'Shop', members: [{ userId: 'user-2', name: 'Grace', role: 'member' }] },
  ]);

  const result = await handler(mockEvent(), logger);

  expect(result.statusCode).toBe(200);
  expect(JSON.parse(result.body!)).toEqual({
    workspaces: [{ workspaceId: 'ws-1', name: 'Shop', members: [{ userId: 'user-2', name: 'Grace', role: 'member' }] }],
  });
});

test('returns 500 when the lookup throws', async () => {
  mockGetDeletionImpact.mockRejectedValue(new Error('ddb down'));

  const result = await handler(mockEvent(), logger);

  expect(result.statusCode).toBe(500);
});
