jest.mock('./workspace.js', () => ({
  handler: jest.fn().mockResolvedValue({ statusCode: 200, body: '"workspace"' }),
}));
jest.mock('./spools/index.js', () => ({
  handler: jest.fn().mockResolvedValue({ statusCode: 200, body: '"spools"' }),
}));
jest.mock('./members/index.js', () => ({
  handler: jest.fn().mockResolvedValue({ statusCode: 200, body: '"members"' }),
}));

import { handler, type WorkspaceEvent } from './index.js';
import { handler as workspaceHandler } from './workspace.js';
import { handler as spoolsHandler } from './spools/index.js';
import { handler as membersHandler } from './members/index.js';

function mockEvent(rawPath: string, workspaceId: string): WorkspaceEvent {
  return {
    rawPath,
    pathParameters: { workspaceId },
    requestContext: { authorizer: { lambda: { userId: 'user-1', role: 'member' } } },
  } as unknown as WorkspaceEvent;
}

beforeEach(() => jest.clearAllMocks());

test('routes /workspaces/{id} to workspace.ts', async () => {
  const result = await handler(mockEvent('/workspaces/ws-1', 'ws-1'));

  expect(workspaceHandler).toHaveBeenCalledTimes(1);
  expect(spoolsHandler).not.toHaveBeenCalled();
  expect(result.headers?.['X-Correlation-Id']).toEqual(expect.any(String));
});

test('routes /workspaces/{id}/spools to spools/index.ts', async () => {
  const result = await handler(mockEvent('/workspaces/ws-1/spools', 'ws-1'));

  expect(spoolsHandler).toHaveBeenCalledTimes(1);
  expect(workspaceHandler).not.toHaveBeenCalled();
  expect(result.headers?.['X-Correlation-Id']).toEqual(expect.any(String));
});

test('routes /workspaces/{id}/spools/{spoolId}/usage to spools/index.ts', async () => {
  const result = await handler(mockEvent('/workspaces/ws-1/spools/spool-1/usage', 'ws-1'));

  expect(spoolsHandler).toHaveBeenCalledTimes(1);
  expect(result.headers?.['X-Correlation-Id']).toEqual(expect.any(String));
});

test('routes /workspaces/{id}/members to members/index.ts', async () => {
  const result = await handler(mockEvent('/workspaces/ws-1/members', 'ws-1'));

  expect(membersHandler).toHaveBeenCalledTimes(1);
  expect(workspaceHandler).not.toHaveBeenCalled();
  expect(result.headers?.['X-Correlation-Id']).toEqual(expect.any(String));
});

test('returns 404 for an unmatched path', async () => {
  const result = await handler(mockEvent('/nope', 'ws-1'));

  expect(result.statusCode).toBe(404);
  expect(workspaceHandler).not.toHaveBeenCalled();
  expect(spoolsHandler).not.toHaveBeenCalled();
});
