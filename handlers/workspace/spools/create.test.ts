import { Logger } from 'logger';
import type { WorkspaceEvent } from '../index.js';

jest.mock('../spools-lookup.js', () => ({ createSpool: jest.fn() }));

import { handler } from './create.js';
import { createSpool } from '../spools-lookup.js';

const mockLogger = new Logger('test-correlation-id');
const mockCreateSpool = createSpool as jest.Mock;

const VALID_BODY = {
  brand: 'Prusament', materialType: 'PLA', materialName: 'Galaxy Black',
  tags: ['glitter'], netWeightG: 1000, remainingWeightG: 1000,
  filamentDiameterMm: 1.75, status: 'in_use',
};

function mockEvent(workspaceId: string, body: unknown): WorkspaceEvent {
  return {
    pathParameters: { workspaceId },
    requestContext: { authorizer: { lambda: { userId: 'user-1', role: 'member' } } },
    body: JSON.stringify(body),
  } as unknown as WorkspaceEvent;
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, 'log').mockImplementation(() => {});
});

afterEach(() => jest.restoreAllMocks());

test('creates a spool and returns 201', async () => {
  mockCreateSpool.mockResolvedValue({ id: 'spool-1', ...VALID_BODY, workspaceId: 'ws-1', addedBy: 'user-1' });

  const result = await handler(mockEvent('ws-1', VALID_BODY), mockLogger);

  expect(result.statusCode).toBe(201);
  expect(mockCreateSpool).toHaveBeenCalledWith('ws-1', 'user-1', expect.objectContaining({ brand: 'Prusament' }));
});

test('ignores client-supplied workspaceId and addedBy, using URL/JWT instead', async () => {
  mockCreateSpool.mockResolvedValue({ id: 'spool-1', ...VALID_BODY, workspaceId: 'ws-1', addedBy: 'user-1' });

  await handler(mockEvent('ws-1', { ...VALID_BODY, workspaceId: 'ws-attacker', addedBy: 'user-attacker' }), mockLogger);

  expect(mockCreateSpool).toHaveBeenCalledWith('ws-1', 'user-1', expect.not.objectContaining({ workspaceId: expect.anything() }));
});

test.each([
  ['brand', { ...VALID_BODY, brand: undefined }],
  ['materialType', { ...VALID_BODY, materialType: undefined }],
  ['materialName', { ...VALID_BODY, materialName: undefined }],
  ['status', { ...VALID_BODY, status: undefined }],
  ['netWeightG', { ...VALID_BODY, netWeightG: 'not-a-number' }],
  ['remainingWeightG', { ...VALID_BODY, remainingWeightG: 'not-a-number' }],
  ['filamentDiameterMm', { ...VALID_BODY, filamentDiameterMm: 'not-a-number' }],
  ['tags', { ...VALID_BODY, tags: 'not-an-array' }],
])('returns 400 when %s is missing or invalid', async (_field, body) => {
  const result = await handler(mockEvent('ws-1', body), mockLogger);

  expect(result.statusCode).toBe(400);
  expect(mockCreateSpool).not.toHaveBeenCalled();
});

test('returns 400 for invalid JSON', async () => {
  const event = {
    pathParameters: { workspaceId: 'ws-1' },
    requestContext: { authorizer: { lambda: { userId: 'user-1', role: 'member' } } },
    body: '{not json',
  } as unknown as WorkspaceEvent;

  const result = await handler(event, mockLogger);

  expect(result.statusCode).toBe(400);
});
