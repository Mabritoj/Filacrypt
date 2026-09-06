import { Logger } from 'logger';
import type { WorkspaceEvent } from '../index.js';

jest.mock('../spools-lookup.js', () => ({ getSpool: jest.fn() }));
jest.mock('../usage-lookup.js', () => ({ listUsageEvents: jest.fn() }));

import { handler } from './usage.js';
import { getSpool } from '../spools-lookup.js';
import { listUsageEvents } from '../usage-lookup.js';

const mockLogger = new Logger('test-correlation-id');
const mockGetSpool = getSpool as jest.Mock;
const mockListUsageEvents = listUsageEvents as jest.Mock;

function mockEvent(workspaceId: string, spoolId: string): WorkspaceEvent {
  return { pathParameters: { workspaceId, spoolId } } as unknown as WorkspaceEvent;
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, 'log').mockImplementation(() => {});
});

afterEach(() => jest.restoreAllMocks());

test('returns 404 without querying usage events when the spool is not in this workspace', async () => {
  mockGetSpool.mockResolvedValue(null);

  const result = await handler(mockEvent('ws-1', 'spool-from-another-workspace'), mockLogger);

  expect(result.statusCode).toBe(404);
  expect(mockListUsageEvents).not.toHaveBeenCalled();
});

test('returns usage events once the spool is confirmed to belong to the workspace', async () => {
  mockGetSpool.mockResolvedValue({ id: 'spool-1', workspaceId: 'ws-1' });
  mockListUsageEvents.mockResolvedValue([{ id: 'usage-1' }]);

  const result = await handler(mockEvent('ws-1', 'spool-1'), mockLogger);

  expect(result.statusCode).toBe(200);
  expect(JSON.parse(result.body as string)).toEqual({ usageEvents: [{ id: 'usage-1' }] });
  expect(mockGetSpool).toHaveBeenCalledWith('ws-1', 'spool-1');
  expect(mockListUsageEvents).toHaveBeenCalledWith('spool-1');
});

test('returns an empty array, not a 404, when the spool has no usage events', async () => {
  mockGetSpool.mockResolvedValue({ id: 'spool-1', workspaceId: 'ws-1' });
  mockListUsageEvents.mockResolvedValue([]);

  const result = await handler(mockEvent('ws-1', 'spool-1'), mockLogger);

  expect(result.statusCode).toBe(200);
  expect(JSON.parse(result.body as string)).toEqual({ usageEvents: [] });
});
