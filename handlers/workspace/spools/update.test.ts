import { Logger } from 'logger';
import type { WorkspaceEvent } from '../index.js';

jest.mock('../spools-lookup.js', () => ({ updateSpool: jest.fn() }));

import { handler } from './update.js';
import { updateSpool } from '../spools-lookup.js';

const mockLogger = new Logger('test-correlation-id');
const mockUpdateSpool = updateSpool as jest.Mock;

function mockEvent(workspaceId: string, spoolId: string, body?: unknown): WorkspaceEvent {
  return {
    pathParameters: { workspaceId, spoolId },
    body: body ? JSON.stringify(body) : undefined,
  } as unknown as WorkspaceEvent;
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, 'log').mockImplementation(() => {});
});

afterEach(() => jest.restoreAllMocks());

test('forwards only the allowed fields and returns the updated spool', async () => {
  mockUpdateSpool.mockResolvedValue({ id: 'spool-1', brand: 'New Brand' });

  const result = await handler(mockEvent('ws-1', 'spool-1', { brand: 'New Brand', id: 'not-allowed' }), mockLogger);

  expect(result.statusCode).toBe(200);
  expect(JSON.parse(result.body as string)).toEqual({ spool: { id: 'spool-1', brand: 'New Brand' } });
  expect(mockUpdateSpool).toHaveBeenCalledWith('ws-1', 'spool-1', { brand: 'New Brand' });
});

test('forwards loadedInPrinterId, a documented-updatable field currently missing from the allowlist', async () => {
  mockUpdateSpool.mockResolvedValue({ id: 'spool-1', loadedInPrinterId: 'printer-123' });

  const result = await handler(
    mockEvent('ws-1', 'spool-1', { loadedInPrinterId: 'printer-123' }),
    mockLogger,
  );

  expect(result.statusCode).toBe(200);
  expect(mockUpdateSpool).toHaveBeenCalledWith('ws-1', 'spool-1', {
    loadedInPrinterId: 'printer-123',
  });
});

test('forwards certifications, a documented-updatable field currently missing from the allowlist', async () => {
  mockUpdateSpool.mockResolvedValue({ id: 'spool-1', certifications: ['ul_2818'] });

  const result = await handler(
    mockEvent('ws-1', 'spool-1', { certifications: ['ul_2818'] }),
    mockLogger,
  );

  expect(result.statusCode).toBe(200);
  expect(mockUpdateSpool).toHaveBeenCalledWith('ws-1', 'spool-1', {
    certifications: ['ul_2818'],
  });
});

test('returns 404 when the spool does not exist', async () => {
  mockUpdateSpool.mockResolvedValue(null);

  const result = await handler(mockEvent('ws-1', 'spool-missing', { brand: 'New Brand' }), mockLogger);

  expect(result.statusCode).toBe(404);
});

test('returns 400 and does not call updateSpool when a number field has the wrong type', async () => {
  const result = await handler(mockEvent('ws-1', 'spool-1', { netWeightG: 'not-a-number' }), mockLogger);

  expect(result.statusCode).toBe(400);
  expect(JSON.parse(result.body as string)).toEqual({
    error: { code: 'VALIDATION_ERROR', message: 'netWeightG must be a number' },
  });
  expect(mockUpdateSpool).not.toHaveBeenCalled();
});

test('returns 400 and does not call updateSpool when a string field has the wrong type', async () => {
  const result = await handler(mockEvent('ws-1', 'spool-1', { brand: 42 }), mockLogger);

  expect(result.statusCode).toBe(400);
  expect(JSON.parse(result.body as string)).toEqual({
    error: { code: 'VALIDATION_ERROR', message: 'brand must be a string' },
  });
  expect(mockUpdateSpool).not.toHaveBeenCalled();
});

test('returns 400 and does not call updateSpool when tags is not an array', async () => {
  const result = await handler(mockEvent('ws-1', 'spool-1', { tags: 'glitter' }), mockLogger);

  expect(result.statusCode).toBe(400);
  expect(JSON.parse(result.body as string)).toEqual({
    error: { code: 'VALIDATION_ERROR', message: 'tags must be an array' },
  });
  expect(mockUpdateSpool).not.toHaveBeenCalled();
});

test('returns 400 when the request body is not valid JSON', async () => {
  const event = {
    pathParameters: { workspaceId: 'ws-1', spoolId: 'spool-1' },
    body: '{not-json',
  } as unknown as WorkspaceEvent;

  const result = await handler(event, mockLogger);

  expect(result.statusCode).toBe(400);
  expect(mockUpdateSpool).not.toHaveBeenCalled();
});
