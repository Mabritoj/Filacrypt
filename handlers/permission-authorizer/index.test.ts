import { getMember } from 'workspace-auth';
import { handler } from './index.js';

jest.mock('workspace-auth', () => {
  const actual = jest.requireActual('workspace-auth');
  return {
    ...actual,
    getMember: jest.fn(),
    verifyBearerToken: jest.fn(),
  };
});

import { verifyBearerToken } from 'workspace-auth';

const mockGetMember = getMember as jest.Mock;
const mockVerifyBearerToken = verifyBearerToken as jest.Mock;

function mockEvent(routeKey: string, pathParameters: Record<string, string>, authHeader = 'Bearer good.token') {
  return {
    routeKey,
    pathParameters,
    headers: { authorization: authHeader },
  } as never;
}

beforeEach(() => jest.clearAllMocks());

test('denies when the bearer token does not verify', async () => {
  const { UnauthorizedError } = jest.requireActual('workspace-auth');
  mockVerifyBearerToken.mockRejectedValue(new UnauthorizedError());

  const result = await handler(mockEvent('GET /workspaces/{workspaceId}', { workspaceId: 'ws-1' }));

  expect(result).toEqual({ isAuthorized: false });
  expect(mockGetMember).not.toHaveBeenCalled();
});

test('denies an unrecognized routeKey', async () => {
  mockVerifyBearerToken.mockResolvedValue('user-1');

  const result = await handler(mockEvent('GET /nonexistent/{id}', { id: 'x' }));

  expect(result).toEqual({ isAuthorized: false });
});

test('denies when the caller has no member item', async () => {
  mockVerifyBearerToken.mockResolvedValue('user-1');
  mockGetMember.mockResolvedValue(null);

  const result = await handler(mockEvent('GET /workspaces/{workspaceId}', { workspaceId: 'ws-1' }));

  expect(result).toEqual({ isAuthorized: false });
  expect(mockGetMember).toHaveBeenCalledWith('user-1', 'ws-1');
});

test('allows any member on a plain-membership route and passes userId/role as context', async () => {
  mockVerifyBearerToken.mockResolvedValue('user-1');
  mockGetMember.mockResolvedValue({ role: 'member' });

  const result = await handler(mockEvent('GET /workspaces/{workspaceId}', { workspaceId: 'ws-1' }));

  expect(result).toEqual({ isAuthorized: true, context: { userId: 'user-1', role: 'member' } });
});

test('denies a member (non-admin, non-owner) on an owner-or-admin route', async () => {
  mockVerifyBearerToken.mockResolvedValue('user-1');
  mockGetMember.mockResolvedValue({ role: 'member' });

  const result = await handler(mockEvent('PATCH /workspaces/{workspaceId}', { workspaceId: 'ws-1' }));

  expect(result).toEqual({ isAuthorized: false });
});

test('allows admin on an owner-or-admin route', async () => {
  mockVerifyBearerToken.mockResolvedValue('user-1');
  mockGetMember.mockResolvedValue({ role: 'admin' });

  const result = await handler(mockEvent('PATCH /workspaces/{workspaceId}', { workspaceId: 'ws-1' }));

  expect(result).toEqual({ isAuthorized: true, context: { userId: 'user-1', role: 'admin' } });
});

test('owner and admin bypass filamentPermissions on a filament route', async () => {
  mockVerifyBearerToken.mockResolvedValue('user-1');
  mockGetMember.mockResolvedValue({ role: 'admin' });

  const result = await handler(
    mockEvent('DELETE /workspaces/{workspaceId}/spools/{spoolId}', { workspaceId: 'ws-1', spoolId: 'spool-1' }),
  );

  expect(result).toEqual({ isAuthorized: true, context: { userId: 'user-1', role: 'admin' } });
});

test('member is allowed on a filament route only with the specific permission granted', async () => {
  mockVerifyBearerToken.mockResolvedValue('user-1');
  mockGetMember.mockResolvedValue({
    role: 'member',
    filamentPermissions: { create: false, read: true, update: false, delete: false },
  });

  const result = await handler(mockEvent('GET /workspaces/{workspaceId}/spools', { workspaceId: 'ws-1' }));

  expect(result).toEqual({ isAuthorized: true, context: { userId: 'user-1', role: 'member' } });
});

test('member is denied on a filament route without the specific permission', async () => {
  mockVerifyBearerToken.mockResolvedValue('user-1');
  mockGetMember.mockResolvedValue({
    role: 'member',
    filamentPermissions: { create: false, read: false, update: false, delete: false },
  });

  const result = await handler(mockEvent('GET /workspaces/{workspaceId}/spools', { workspaceId: 'ws-1' }));

  expect(result).toEqual({ isAuthorized: false });
});

test('denies when workspaceId is missing from pathParameters', async () => {
  mockVerifyBearerToken.mockResolvedValue('user-1');

  const result = await handler(mockEvent('GET /workspaces/{workspaceId}', {}));

  expect(result).toEqual({ isAuthorized: false });
  expect(mockGetMember).not.toHaveBeenCalled();
});

test('denies admin on an owner-only route', async () => {
  mockVerifyBearerToken.mockResolvedValue('user-1');
  mockGetMember.mockResolvedValue({ role: 'admin' });

  const result = await handler(
    mockEvent('PATCH /workspaces/{workspaceId}/members/{userId}/role', { workspaceId: 'ws-1', userId: 'user-2' }),
  );

  expect(result).toEqual({ isAuthorized: false });
});

test('allows owner on an owner-only route', async () => {
  mockVerifyBearerToken.mockResolvedValue('user-1');
  mockGetMember.mockResolvedValue({ role: 'owner' });

  const result = await handler(
    mockEvent('PATCH /workspaces/{workspaceId}/members/{userId}/role', { workspaceId: 'ws-1', userId: 'user-2' }),
  );

  expect(result).toEqual({ isAuthorized: true, context: { userId: 'user-1', role: 'owner' } });
});

test('denies removing a member when the target is the workspace owner, even for an admin caller', async () => {
  mockVerifyBearerToken.mockResolvedValue('user-1');
  mockGetMember
    .mockResolvedValueOnce({ role: 'admin' }) // caller
    .mockResolvedValueOnce({ role: 'owner' }); // target

  const result = await handler(
    mockEvent('DELETE /workspaces/{workspaceId}/members/{userId}', { workspaceId: 'ws-1', userId: 'user-2' }),
  );

  expect(result).toEqual({ isAuthorized: false });
  expect(mockGetMember).toHaveBeenNthCalledWith(1, 'user-1', 'ws-1');
  expect(mockGetMember).toHaveBeenNthCalledWith(2, 'user-2', 'ws-1');
});

test('allows removing a non-owner member as owner', async () => {
  mockVerifyBearerToken.mockResolvedValue('user-1');
  mockGetMember
    .mockResolvedValueOnce({ role: 'owner' }) // caller
    .mockResolvedValueOnce({ role: 'member' }); // target

  const result = await handler(
    mockEvent('DELETE /workspaces/{workspaceId}/members/{userId}', { workspaceId: 'ws-1', userId: 'user-2' }),
  );

  expect(result).toEqual({ isAuthorized: true, context: { userId: 'user-1', role: 'owner' } });
});
