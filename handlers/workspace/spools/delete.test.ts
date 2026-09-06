import { Logger } from 'logger';
import type { WorkspaceEvent } from '../index.js';

jest.mock('../spools-lookup.js', () => ({ deleteSpool: jest.fn() }));

import { handler } from './delete.js';
import { deleteSpool } from '../spools-lookup.js';

const mockLogger = new Logger('test-correlation-id');
const mockDeleteSpool = deleteSpool as jest.Mock;

function mockEvent(workspaceId: string, spoolId: string): WorkspaceEvent {
  return { pathParameters: { workspaceId, spoolId } } as unknown as WorkspaceEvent;
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, 'log').mockImplementation(() => {});
});

afterEach(() => jest.restoreAllMocks());

test('returns 204 on success', async () => {
  mockDeleteSpool.mockResolvedValue(true);

  const result = await handler(mockEvent('ws-1', 'spool-1'), mockLogger);

  expect(result.statusCode).toBe(204);
  expect(result.body).toBeUndefined();
  expect(mockDeleteSpool).toHaveBeenCalledWith('ws-1', 'spool-1');
});

test('returns 404 when the spool does not exist', async () => {
  mockDeleteSpool.mockResolvedValue(false);

  const result = await handler(mockEvent('ws-1', 'spool-missing'), mockLogger);

  expect(result.statusCode).toBe(404);
});
