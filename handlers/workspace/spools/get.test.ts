import { Logger } from 'logger';
import type { WorkspaceEvent } from '../index.js';

jest.mock('../spools-lookup.js', () => ({ getSpool: jest.fn() }));

import { handler } from './get.js';
import { getSpool } from '../spools-lookup.js';

const mockLogger = new Logger('test-correlation-id');
const mockGetSpool = getSpool as jest.Mock;

function mockEvent(workspaceId: string, spoolId: string): WorkspaceEvent {
  return { pathParameters: { workspaceId, spoolId } } as unknown as WorkspaceEvent;
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, 'log').mockImplementation(() => {});
});

afterEach(() => jest.restoreAllMocks());

test('returns the spool on success', async () => {
  mockGetSpool.mockResolvedValue({ id: 'spool-1' });

  const result = await handler(mockEvent('ws-1', 'spool-1'), mockLogger);

  expect(result.statusCode).toBe(200);
  expect(JSON.parse(result.body as string)).toEqual({ spool: { id: 'spool-1' } });
  expect(mockGetSpool).toHaveBeenCalledWith('ws-1', 'spool-1');
});

test('returns 404 when the spool does not exist in this workspace', async () => {
  mockGetSpool.mockResolvedValue(null);

  const result = await handler(mockEvent('ws-1', 'spool-missing'), mockLogger);

  expect(result.statusCode).toBe(404);
});
