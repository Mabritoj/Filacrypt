import { APIGatewayProxyEventV2WithJWTAuthorizer } from 'aws-lambda';
import { Logger } from 'logger';

jest.mock('./lookup.js', () => ({
  getUserAndWorkspaces: jest.fn(),
}));
jest.mock('./me-preferences.js', () => ({
  handler: jest.fn().mockResolvedValue({ statusCode: 200, body: '"preferences"' }),
}));
jest.mock('./me-delete.js', () => ({
  handler: jest.fn().mockResolvedValue({ statusCode: 204 }),
}));

import { handler } from './me.js';
import { getUserAndWorkspaces } from './lookup.js';
import { handler as preferencesHandler } from './me-preferences.js';
import { handler as deleteHandler } from './me-delete.js';

const mockLogger = new Logger('test-correlation-id');
const mockGetUserAndWorkspaces = getUserAndWorkspaces as jest.Mock;

function mockEventFor(userId: string, method = 'GET'): APIGatewayProxyEventV2WithJWTAuthorizer {
  return {
    requestContext: {
      http: { method },
      authorizer: { jwt: { claims: { sub: userId }, scopes: null } },
    },
  } as unknown as APIGatewayProxyEventV2WithJWTAuthorizer;
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, 'log').mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

test('returns the profile and workspace ids for a known user', async () => {
  const profile = {
    user: {
      id: 'user-123', name: 'Jonathan', username: 'jmabrito', email: 'jonathan@example.com',
      emailVerified: true, preferences: { weightUnit: 'g', temperatureUnit: 'C', lengthUnit: 'm', currency: 'USD', theme: 'dark' },
      createdAt: '2026-07-11T00:00:00.000Z',
    },
    workspaceIds: ['ws-1'],
  };
  mockGetUserAndWorkspaces.mockResolvedValue(profile);

  const result = await handler(mockEventFor('user-123'), mockLogger);

  expect(result.statusCode).toBe(200);
  expect(JSON.parse(result.body as string)).toEqual(profile);
});

test('returns 404 when the user has not been provisioned yet', async () => {
  mockGetUserAndWorkspaces.mockResolvedValue(null);

  const result = await handler(mockEventFor('unknown-user'), mockLogger);

  expect(result.statusCode).toBe(404);
  expect(JSON.parse(result.body as string)).toEqual({
    error: { code: 'NOT_FOUND', message: 'User not found' },
  });
});

test('returns 500 when the lookup throws', async () => {
  mockGetUserAndWorkspaces.mockRejectedValue(new Error('DynamoDB unavailable'));

  const result = await handler(mockEventFor('user-123'), mockLogger);

  expect(result.statusCode).toBe(500);
  expect(JSON.parse(result.body as string)).toEqual({
    error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch current user' },
  });
});

test('PATCH routes to me-preferences.ts', async () => {
  const result = await handler(mockEventFor('user-123', 'PATCH'), mockLogger);

  expect(preferencesHandler).toHaveBeenCalledTimes(1);
  expect(result.statusCode).toBe(200);
  expect(mockGetUserAndWorkspaces).not.toHaveBeenCalled();
});

test('DELETE routes to me-delete.ts', async () => {
  const result = await handler(mockEventFor('user-123', 'DELETE'), mockLogger);

  expect(deleteHandler).toHaveBeenCalledTimes(1);
  expect(result.statusCode).toBe(204);
  expect(mockGetUserAndWorkspaces).not.toHaveBeenCalled();
});

test('returns 405 for an unsupported method', async () => {
  const result = await handler(mockEventFor('user-123', 'PUT'), mockLogger);

  expect(result.statusCode).toBe(405);
  expect(mockGetUserAndWorkspaces).not.toHaveBeenCalled();
});
