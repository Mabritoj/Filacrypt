import { Logger } from 'logger';
import type { WorkspaceEvent } from '../index.js';

jest.mock('./list.js', () => ({ handler: jest.fn().mockResolvedValue({ statusCode: 200, body: '"list"' }) }));
jest.mock('./create.js', () => ({ handler: jest.fn().mockResolvedValue({ statusCode: 201, body: '"create"' }) }));
jest.mock('./get.js', () => ({ handler: jest.fn().mockResolvedValue({ statusCode: 200, body: '"get"' }) }));
jest.mock('./usage.js', () => ({ handler: jest.fn().mockResolvedValue({ statusCode: 200, body: '"usage"' }) }));
jest.mock('./update.js', () => ({ handler: jest.fn().mockResolvedValue({ statusCode: 200, body: '"update"' }) }));
jest.mock('./delete.js', () => ({ handler: jest.fn().mockResolvedValue({ statusCode: 204 }) }));

import { handler } from './index.js';
import { handler as listHandler } from './list.js';
import { handler as createHandler } from './create.js';
import { handler as getHandler } from './get.js';
import { handler as usageHandler } from './usage.js';
import { handler as updateHandler } from './update.js';
import { handler as deleteHandler } from './delete.js';

const mockLogger = new Logger('test-correlation-id');

function mockEvent(
  method: string,
  rawPath: string,
  spoolId?: string,
): WorkspaceEvent {
  return {
    requestContext: { http: { method } },
    rawPath,
    pathParameters: spoolId ? { spoolId } : {},
  } as unknown as WorkspaceEvent;
}

beforeEach(() => jest.clearAllMocks());

test('GET /workspaces/{id}/spools (no spoolId) routes to list.ts', async () => {
  await handler(mockEvent('GET', '/workspaces/ws-1/spools'), mockLogger);
  expect(listHandler).toHaveBeenCalledTimes(1);
});

test('POST /workspaces/{id}/spools routes to create.ts', async () => {
  await handler(mockEvent('POST', '/workspaces/ws-1/spools'), mockLogger);
  expect(createHandler).toHaveBeenCalledTimes(1);
});

test('GET /workspaces/{id}/spools/{spoolId}/usage routes to usage.ts, not get.ts', async () => {
  await handler(mockEvent('GET', '/workspaces/ws-1/spools/spool-1/usage', 'spool-1'), mockLogger);
  expect(usageHandler).toHaveBeenCalledTimes(1);
  expect(getHandler).not.toHaveBeenCalled();
});

test('GET /workspaces/{id}/spools/{spoolId} routes to get.ts', async () => {
  await handler(mockEvent('GET', '/workspaces/ws-1/spools/spool-1', 'spool-1'), mockLogger);
  expect(getHandler).toHaveBeenCalledTimes(1);
});

test('PATCH /workspaces/{id}/spools/{spoolId} routes to update.ts', async () => {
  await handler(mockEvent('PATCH', '/workspaces/ws-1/spools/spool-1', 'spool-1'), mockLogger);
  expect(updateHandler).toHaveBeenCalledTimes(1);
});

test('DELETE /workspaces/{id}/spools/{spoolId} routes to delete.ts', async () => {
  await handler(mockEvent('DELETE', '/workspaces/ws-1/spools/spool-1', 'spool-1'), mockLogger);
  expect(deleteHandler).toHaveBeenCalledTimes(1);
});

test('returns 405 for an unsupported method', async () => {
  const result = await handler(mockEvent('PUT', '/workspaces/ws-1/spools/spool-1', 'spool-1'), mockLogger);
  expect(result.statusCode).toBe(405);
});
