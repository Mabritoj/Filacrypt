import { mockClient } from 'aws-sdk-client-mock';
import { CognitoIdentityProviderClient, AdminDeleteUserCommand } from '@aws-sdk/client-cognito-identity-provider';
import { APIGatewayProxyEventV2WithJWTAuthorizer } from 'aws-lambda';
import { Logger } from 'logger';

jest.mock('./lookup.js', () => ({ deleteUserAccount: jest.fn(), getDeletionImpact: jest.fn() }));

import { handler } from './me-delete.js';
import { deleteUserAccount, getDeletionImpact } from './lookup.js';

const cognitoMock = mockClient(CognitoIdentityProviderClient);
const mockLogger = new Logger('test-correlation-id');
const mockDeleteUserAccount = deleteUserAccount as jest.Mock;
const mockGetDeletionImpact = getDeletionImpact as jest.Mock;

function mockEvent(userId: string, body: string | null = null): APIGatewayProxyEventV2WithJWTAuthorizer {
  return {
    requestContext: { authorizer: { jwt: { claims: { sub: userId }, scopes: null } } },
    body,
  } as unknown as APIGatewayProxyEventV2WithJWTAuthorizer;
}

beforeEach(() => {
  jest.clearAllMocks();
  cognitoMock.reset();
  mockGetDeletionImpact.mockResolvedValue([]);
  jest.spyOn(console, 'log').mockImplementation(() => {});
});

afterEach(() => jest.restoreAllMocks());

test('deletes the DynamoDB data then the Cognito user, returning 204', async () => {
  mockDeleteUserAccount.mockResolvedValue(true);
  cognitoMock.on(AdminDeleteUserCommand).resolves({});

  const result = await handler(mockEvent('user-1'), mockLogger);

  expect(result.statusCode).toBe(204);
  expect(mockDeleteUserAccount).toHaveBeenCalledWith('user-1', {});
  const call = cognitoMock.commandCalls(AdminDeleteUserCommand)[0];
  expect(call.args[0].input).toMatchObject({ UserPoolId: 'test-user-pool', Username: 'user-1' });
});

test('returns 404 when the user does not exist', async () => {
  mockDeleteUserAccount.mockResolvedValue(false);

  const result = await handler(mockEvent('user-1'), mockLogger);

  expect(result.statusCode).toBe(404);
  expect(cognitoMock.commandCalls(AdminDeleteUserCommand)).toHaveLength(0);
});

test('returns 500 and does not call Cognito when the DynamoDB cleanup throws', async () => {
  mockDeleteUserAccount.mockRejectedValue(new Error('DynamoDB unavailable'));

  const result = await handler(mockEvent('user-1'), mockLogger);

  expect(result.statusCode).toBe(500);
  expect(cognitoMock.commandCalls(AdminDeleteUserCommand)).toHaveLength(0);
});

test('still returns 204 when DynamoDB cleanup succeeds but Cognito deletion fails', async () => {
  mockDeleteUserAccount.mockResolvedValue(true);
  cognitoMock.on(AdminDeleteUserCommand).rejects(new Error('Cognito unavailable'));

  const result = await handler(mockEvent('user-1'), mockLogger);

  expect(result.statusCode).toBe(204);
});

test('400s listing every owned multi-member workspace missing a resolution', async () => {
  mockGetDeletionImpact.mockResolvedValue([
    { workspaceId: 'ws-1', name: 'Shop', members: [{ userId: 'user-2', name: 'Grace', role: 'member' }] },
    { workspaceId: 'ws-2', name: 'Garage', members: [{ userId: 'user-3', name: 'Ada', role: 'admin' }] },
  ]);

  const result = await handler(
    mockEvent('user-1', JSON.stringify({ workspaceResolutions: {} })),
    mockLogger,
  );

  expect(result.statusCode).toBe(400);
  expect(JSON.parse(result.body!).error.workspaceIds).toEqual(['ws-1', 'ws-2']);
  expect(mockDeleteUserAccount).not.toHaveBeenCalled();
});

test("400s when newOwnerId is not among that workspace's other members", async () => {
  mockGetDeletionImpact.mockResolvedValue([
    { workspaceId: 'ws-1', name: 'Shop', members: [{ userId: 'user-2', name: 'Grace', role: 'member' }] },
  ]);

  const result = await handler(
    mockEvent(
      'user-1',
      JSON.stringify({ workspaceResolutions: { 'ws-1': { action: 'reassign', newOwnerId: 'not-a-member' } } }),
    ),
    mockLogger,
  );

  expect(result.statusCode).toBe(400);
  expect(mockDeleteUserAccount).not.toHaveBeenCalled();
});

test('proceeds with valid resolutions for every owned multi-member workspace', async () => {
  mockGetDeletionImpact.mockResolvedValue([
    { workspaceId: 'ws-1', name: 'Shop', members: [{ userId: 'user-2', name: 'Grace', role: 'member' }] },
  ]);
  mockDeleteUserAccount.mockResolvedValue(true);

  const result = await handler(
    mockEvent(
      'user-1',
      JSON.stringify({ workspaceResolutions: { 'ws-1': { action: 'reassign', newOwnerId: 'user-2' } } }),
    ),
    mockLogger,
  );

  expect(result.statusCode).toBe(204);
  expect(mockDeleteUserAccount).toHaveBeenCalledWith('user-1', {
    'ws-1': { action: 'reassign', newOwnerId: 'user-2' },
  });
});

test('proceeds with no body when there are no owned multi-member workspaces', async () => {
  mockGetDeletionImpact.mockResolvedValue([]);
  mockDeleteUserAccount.mockResolvedValue(true);

  const result = await handler(mockEvent('user-1', null), mockLogger);

  expect(result.statusCode).toBe(204);
  expect(mockDeleteUserAccount).toHaveBeenCalledWith('user-1', {});
});
