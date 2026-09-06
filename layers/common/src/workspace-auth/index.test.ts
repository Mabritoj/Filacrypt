jest.mock('aws-jwt-verify');

import { mockClient } from 'aws-sdk-client-mock';
import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb';
import { config } from 'env-config';
import {
  getMember,
  assertWorkspaceMember,
  assertFilamentPermission,
  verifyBearerToken,
  ForbiddenError,
  UnauthorizedError,
} from './index.js';
import { CognitoJwtVerifier } from 'aws-jwt-verify';

const ddbMock = mockClient(DynamoDBDocumentClient);
const mockCognitoJwtVerifier = CognitoJwtVerifier as jest.Mocked<typeof CognitoJwtVerifier>;

beforeEach(() => ddbMock.reset());

describe('getMember', () => {
  test('returns the member when one exists', async () => {
    ddbMock.on(GetCommand).resolves({ Item: { role: 'admin' } });

    await expect(getMember('user-1', 'ws-1')).resolves.toEqual({ role: 'admin', filamentPermissions: undefined });

    const call = ddbMock.commandCalls(GetCommand)[0];
    expect(call.args[0].input).toMatchObject({
      TableName: config.tableName,
      Key: { PK: 'WORKSPACE#ws-1', SK: 'MEMBER#user-1' },
    });
  });

  test('returns null when no member item exists', async () => {
    ddbMock.on(GetCommand).resolves({ Item: undefined });

    await expect(getMember('user-1', 'ws-1')).resolves.toBeNull();
  });

  test('carries filamentPermissions through for a member-role item', async () => {
    const filamentPermissions = { create: false, read: true, update: false, delete: false };
    ddbMock.on(GetCommand).resolves({ Item: { role: 'member', filamentPermissions } });

    await expect(getMember('user-1', 'ws-1')).resolves.toEqual({ role: 'member', filamentPermissions });
  });
});

describe('assertWorkspaceMember', () => {
  test('resolves with the member when the caller is a member', async () => {
    ddbMock.on(GetCommand).resolves({ Item: { role: 'owner' } });

    await expect(assertWorkspaceMember('user-1', 'ws-1')).resolves.toEqual({
      role: 'owner',
      filamentPermissions: undefined,
    });
  });

  test('throws ForbiddenError when the caller is not a member', async () => {
    ddbMock.on(GetCommand).resolves({ Item: undefined });

    await expect(assertWorkspaceMember('user-1', 'ws-1')).rejects.toThrow(ForbiddenError);
  });
});

describe('assertFilamentPermission', () => {
  test('owner passes regardless of filamentPermissions', async () => {
    ddbMock.on(GetCommand).resolves({ Item: { role: 'owner' } });

    await expect(assertFilamentPermission('user-1', 'ws-1', 'delete')).resolves.toEqual({
      role: 'owner',
      filamentPermissions: undefined,
    });
  });

  test('admin passes regardless of filamentPermissions', async () => {
    ddbMock.on(GetCommand).resolves({ Item: { role: 'admin' } });

    await expect(assertFilamentPermission('user-1', 'ws-1', 'delete')).resolves.toEqual({
      role: 'admin',
      filamentPermissions: undefined,
    });
  });

  test('member passes when the specific permission is granted', async () => {
    ddbMock.on(GetCommand).resolves({
      Item: { role: 'member', filamentPermissions: { create: false, read: true, update: false, delete: false } },
    });

    await expect(assertFilamentPermission('user-1', 'ws-1', 'read')).resolves.toBeDefined();
  });

  test('member is denied when the specific permission is not granted', async () => {
    ddbMock.on(GetCommand).resolves({
      Item: { role: 'member', filamentPermissions: { create: false, read: false, update: false, delete: false } },
    });

    await expect(assertFilamentPermission('user-1', 'ws-1', 'read')).rejects.toThrow(ForbiddenError);
  });

  test('member with no filamentPermissions field at all is denied', async () => {
    ddbMock.on(GetCommand).resolves({ Item: { role: 'member' } });

    await expect(assertFilamentPermission('user-1', 'ws-1', 'read')).rejects.toThrow(ForbiddenError);
  });

  test('non-member is denied before any permission is considered', async () => {
    ddbMock.on(GetCommand).resolves({ Item: undefined });

    await expect(assertFilamentPermission('user-1', 'ws-1', 'read')).rejects.toThrow(ForbiddenError);
  });
});

describe('verifyBearerToken', () => {
  const mockVerify = jest.fn();

  beforeAll(() => {
    process.env.COGNITO_USER_POOL_ID = 'us-east-1_test';
    process.env.COGNITO_CLIENT_ID = 'test-client';
    mockCognitoJwtVerifier.create = jest.fn(() => ({ verify: mockVerify })) as any;
  });

  beforeEach(() => jest.clearAllMocks());

  test('returns the sub for a valid token', async () => {
    mockVerify.mockResolvedValue({ sub: 'user-1' });

    await expect(verifyBearerToken('Bearer good.token.here')).resolves.toBe('user-1');
    expect(mockVerify).toHaveBeenCalledWith('good.token.here');
  });

  test('rejects a missing header', async () => {
    await expect(verifyBearerToken(undefined)).rejects.toBeInstanceOf(UnauthorizedError);
    expect(mockVerify).not.toHaveBeenCalled();
  });

  test('rejects a header without the Bearer prefix', async () => {
    await expect(verifyBearerToken('good.token.here')).rejects.toBeInstanceOf(UnauthorizedError);
  });

  test('rejects a token the verifier refuses', async () => {
    mockVerify.mockRejectedValue(new Error('expired'));

    await expect(verifyBearerToken('Bearer bad.token')).rejects.toBeInstanceOf(UnauthorizedError);
  });

  test('rejects a token with no sub claim', async () => {
    mockVerify.mockResolvedValue({ email: 'a@b.com' });

    await expect(verifyBearerToken('Bearer no.sub')).rejects.toBeInstanceOf(UnauthorizedError);
  });
});
