import { APIGatewayProxyEventV2WithJWTAuthorizer } from 'aws-lambda';

jest.mock('./me.js', () => ({
  handler: jest.fn().mockResolvedValue({ statusCode: 200, body: '"me"' }),
}));
jest.mock('./user/index.js', () => ({
  handler: jest.fn().mockResolvedValue({ statusCode: 200, body: '"user"' }),
}));
jest.mock('./me-deletion-impact.js', () => ({
  handler: jest.fn().mockResolvedValue({ statusCode: 200, body: '"deletion-impact"' }),
}));

import { handler } from './index.js';
import { handler as meHandler } from './me.js';
import { handler as userHandler } from './user/index.js';
import { handler as meDeletionImpactHandler } from './me-deletion-impact.js';

function mockEvent(rawPath: string): APIGatewayProxyEventV2WithJWTAuthorizer {
  return { rawPath } as unknown as APIGatewayProxyEventV2WithJWTAuthorizer;
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, 'log').mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

test('routes GET /me to me.ts', async () => {
  const result = await handler(mockEvent('/me'));

  expect(meHandler).toHaveBeenCalledTimes(1);
  expect(userHandler).not.toHaveBeenCalled();
  expect(result.statusCode).toBe(200);
  expect(result.headers?.['X-Correlation-Id']).toEqual(expect.any(String));
});

test('routes /me/deletion-impact to me-deletion-impact.ts', async () => {
  const result = await handler(mockEvent('/me/deletion-impact'));

  expect(meDeletionImpactHandler).toHaveBeenCalledTimes(1);
  expect(meHandler).not.toHaveBeenCalled();
  expect(userHandler).not.toHaveBeenCalled();
  expect(result.statusCode).toBe(200);
  expect(result.headers?.['X-Correlation-Id']).toEqual(expect.any(String));
});

test('routes /user/* to user/index.ts', async () => {
  const result = await handler(mockEvent('/user/setup'));

  expect(userHandler).toHaveBeenCalledTimes(1);
  expect(meHandler).not.toHaveBeenCalled();
  expect(result.statusCode).toBe(200);
  expect(result.headers?.['X-Correlation-Id']).toEqual(expect.any(String));
});

test('returns 404 for an unmatched path', async () => {
  const result = await handler(mockEvent('/nope'));

  expect(meHandler).not.toHaveBeenCalled();
  expect(userHandler).not.toHaveBeenCalled();
  expect(result.statusCode).toBe(404);
  expect(result.headers?.['X-Correlation-Id']).toEqual(expect.any(String));
  expect(JSON.parse(result.body as string)).toEqual({ error: { code: 'NOT_FOUND', message: 'Not found' } });
});
