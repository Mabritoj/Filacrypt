import { Logger } from 'logger';
import type { WorkspaceEvent } from '../index.js';

jest.mock('../spools-lookup.js', () => ({ listSpools: jest.fn() }));

import { handler } from './list.js';
import { listSpools } from '../spools-lookup.js';

const mockLogger = new Logger('test-correlation-id');
const mockListSpools = listSpools as jest.Mock;

function mockEvent(workspaceId: string): WorkspaceEvent {
  return { pathParameters: { workspaceId } } as unknown as WorkspaceEvent;
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, 'log').mockImplementation(() => {});
});

afterEach(() => jest.restoreAllMocks());

test('returns spools for the workspace', async () => {
  mockListSpools.mockResolvedValue([{ id: 'spool-1' }]);

  const result = await handler(mockEvent('ws-1'), mockLogger);

  expect(result.statusCode).toBe(200);
  expect(JSON.parse(result.body as string)).toEqual({ spools: [{ id: 'spool-1' }] });
  expect(mockListSpools).toHaveBeenCalledWith('ws-1');
});

test('returns 500 when the lookup throws', async () => {
  mockListSpools.mockRejectedValue(new Error('DynamoDB unavailable'));

  const result = await handler(mockEvent('ws-1'), mockLogger);

  expect(result.statusCode).toBe(500);
});
