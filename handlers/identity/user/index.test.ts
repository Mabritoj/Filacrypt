import { APIGatewayProxyEventV2WithJWTAuthorizer } from 'aws-lambda';
import { Logger } from 'logger';

jest.mock('./setup.js', () => ({
  handler: jest.fn().mockResolvedValue({ statusCode: 201, body: '"setup"' }),
}));

import { handler } from './index.js';
import { handler as setupHandler } from './setup.js';

const mockLogger = new Logger('test-correlation-id');

function mockEvent(rawPath: string, method: string): APIGatewayProxyEventV2WithJWTAuthorizer {
  return {
    rawPath,
    requestContext: { http: { method } },
  } as unknown as APIGatewayProxyEventV2WithJWTAuthorizer;
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, 'log').mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

test('routes POST /user/setup to setup.ts', async () => {
  const result = await handler(mockEvent('/user/setup', 'POST'), mockLogger);

  expect(setupHandler).toHaveBeenCalledTimes(1);
  expect(result.statusCode).toBe(201);
});

test('returns 405 for anything else under /user', async () => {
  const result = await handler(mockEvent('/user/setup', 'GET'), mockLogger);

  expect(setupHandler).not.toHaveBeenCalled();
  expect(result.statusCode).toBe(405);
  expect(JSON.parse(result.body as string)).toEqual({
    error: { code: 'METHOD_NOT_ALLOWED', message: 'Method not allowed' },
  });
});
