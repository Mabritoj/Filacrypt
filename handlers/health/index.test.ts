import { APIGatewayProxyEventV2 } from 'aws-lambda';
import { handler } from './index.js';

const mockEvent = {} as unknown as APIGatewayProxyEventV2;

test('returns 200 with a correlation id header and ok body', async () => {
  const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

  const result = await handler(mockEvent);

  expect(result.statusCode).toBe(200);
  expect(result.headers?.['X-Correlation-Id']).toEqual(expect.any(String));
  expect(JSON.parse(result.body as string)).toEqual({ status: 'ok' });

  logSpy.mockRestore();
});
