import { APIGatewayProxyEventV2WithJWTAuthorizer } from 'aws-lambda';
import { Logger } from 'logger';

jest.mock('./lookup.js', () => ({ updateUserPreferences: jest.fn() }));

import { handler } from './me-preferences.js';
import { updateUserPreferences } from './lookup.js';

const mockLogger = new Logger('test-correlation-id');
const mockUpdateUserPreferences = updateUserPreferences as jest.Mock;

function mockEvent(userId: string, body?: unknown): APIGatewayProxyEventV2WithJWTAuthorizer {
  return {
    requestContext: { authorizer: { jwt: { claims: { sub: userId }, scopes: null } } },
    body: body ? JSON.stringify(body) : undefined,
  } as unknown as APIGatewayProxyEventV2WithJWTAuthorizer;
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, 'log').mockImplementation(() => {});
});

afterEach(() => jest.restoreAllMocks());

test('forwards only preferences fields and returns the updated user', async () => {
  mockUpdateUserPreferences.mockResolvedValue({ id: 'user-1', preferences: { weightUnit: 'kg' } });

  const result = await handler(
    mockEvent('user-1', { preferences: { weightUnit: 'kg' }, name: 'not allowed' }),
    mockLogger,
  );

  expect(result.statusCode).toBe(200);
  expect(JSON.parse(result.body as string)).toEqual({
    user: { id: 'user-1', preferences: { weightUnit: 'kg' } },
  });
  expect(mockUpdateUserPreferences).toHaveBeenCalledWith('user-1', { weightUnit: 'kg' });
});

test('returns 404 when the user does not exist', async () => {
  mockUpdateUserPreferences.mockResolvedValue(null);

  const result = await handler(mockEvent('user-1', { preferences: { weightUnit: 'kg' } }), mockLogger);

  expect(result.statusCode).toBe(404);
});

test('returns 400 when a preference has an invalid value', async () => {
  const result = await handler(
    mockEvent('user-1', { preferences: { weightUnit: 'lbs' } }),
    mockLogger,
  );

  expect(result.statusCode).toBe(400);
  expect(JSON.parse(result.body as string)).toEqual({
    error: { code: 'VALIDATION_ERROR', message: "weightUnit must be one of: g, kg" },
  });
  expect(mockUpdateUserPreferences).not.toHaveBeenCalled();
});

test('returns 400 for a malformed JSON body', async () => {
  const event = {
    requestContext: { authorizer: { jwt: { claims: { sub: 'user-1' }, scopes: null } } },
    body: '{not-json',
  } as unknown as APIGatewayProxyEventV2WithJWTAuthorizer;

  const result = await handler(event, mockLogger);

  expect(result.statusCode).toBe(400);
  expect(mockUpdateUserPreferences).not.toHaveBeenCalled();
});

test('returns 500 when the update throws', async () => {
  mockUpdateUserPreferences.mockRejectedValue(new Error('DynamoDB unavailable'));

  const result = await handler(mockEvent('user-1', { preferences: { theme: 'light' } }), mockLogger);

  expect(result.statusCode).toBe(500);
});
