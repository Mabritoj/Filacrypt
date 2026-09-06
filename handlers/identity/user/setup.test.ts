import { mockClient } from 'aws-sdk-client-mock';
import { DynamoDBClient, GetItemCommand, TransactWriteItemsCommand, UpdateItemCommand } from '@aws-sdk/client-dynamodb';
import { APIGatewayProxyEventV2WithJWTAuthorizer } from 'aws-lambda';
import { Logger } from 'logger';
import { config } from 'env-config';

jest.mock('../lookup.js', () => ({
  getUserAndWorkspaces: jest.fn(),
}));

import { handler } from './setup.js';
import { getUserAndWorkspaces } from '../lookup.js';

const ddbMock = mockClient(DynamoDBClient);
const mockLogger = new Logger('test-correlation-id');
const mockGetUserAndWorkspaces = getUserAndWorkspaces as jest.Mock;

function mockEvent(
  userId: string,
  email: string,
  body: Record<string, unknown> | undefined
): APIGatewayProxyEventV2WithJWTAuthorizer {
  return {
    body: body === undefined ? undefined : JSON.stringify(body),
    requestContext: {
      authorizer: { jwt: { claims: { sub: userId, email, email_verified: 'true' }, scopes: null } },
      http: { method: 'POST' },
    },
  } as unknown as APIGatewayProxyEventV2WithJWTAuthorizer;
}

beforeEach(() => {
  ddbMock.reset();
  jest.clearAllMocks();
  jest.spyOn(console, 'log').mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

test('creates a new user when the username is available', async () => {
  const created = {
    user: { id: 'user-123', name: 'Jonathan', username: 'jmabrito', email: 'jonathan@example.com', emailVerified: true, preferences: { weightUnit: 'g', temperatureUnit: 'C', lengthUnit: 'm', currency: 'USD', theme: 'dark', defaultEntryMode: 'nfc' }, createdAt: '2026-07-11T00:00:00.000Z' },
    workspaceIds: ['ws-1'],
  };
  mockGetUserAndWorkspaces
    .mockResolvedValueOnce(null)
    .mockResolvedValueOnce(created);
  ddbMock.on(GetItemCommand).resolves({ Item: undefined });
  ddbMock.on(TransactWriteItemsCommand).resolves({});

  const result = await handler(mockEvent('user-123', 'jonathan@example.com', { name: 'Jonathan', username: 'jmabrito' }), mockLogger);

  expect(result.statusCode).toBe(201);
  expect(JSON.parse(result.body as string)).toEqual(created);
  const transactCall = ddbMock.commandCalls(TransactWriteItemsCommand)[0];
  const items = transactCall.args[0].input.TransactItems;
  expect(items).toBeDefined();
  expect(items).toHaveLength(4);

  // Assert TransactItems[0]: User item with condition
  const userPut = items![0].Put!;
  const userItem = userPut.Item!;
  expect(userItem.PK?.S).toBe('USER#user-123');
  expect(userItem.SK?.S).toBe('PROFILE');
  expect(userItem.name?.S).toBe('Jonathan');
  expect(userItem.username?.S).toBe('jmabrito');
  expect(userItem.email?.S).toBe('jonathan@example.com');
  expect(userItem.emailVerified?.BOOL).toBe(true);
  expect(transactCall.args[0].input.TransactItems![0].Put!.Item).toMatchObject({
    GSI2PK: { S: 'EMAIL#jonathan@example.com' },
    GSI2SK: { S: 'PROFILE' },
  });
  expect(userItem.preferences?.M).toEqual({
    weightUnit: { S: 'g' },
    temperatureUnit: { S: 'C' },
    lengthUnit: { S: 'm' },
    currency: { S: 'USD' },
    theme: { S: 'dark' },
    defaultEntryMode: { S: 'nfc' },
  });
  expect(userPut.ConditionExpression).toBe('attribute_not_exists(PK)');

  // Assert TransactItems[1]: Workspace item without condition
  const workspacePut = items![1].Put!;
  expect(workspacePut.ConditionExpression).toBeUndefined();
  expect(workspacePut.Item).toMatchObject({
    lowStockThresholdG: { N: '200' },
    defaultDiameterMm: { N: '1.75' },
    defaultEmptySpoolWeightG: { N: '215' },
  });

  // Assert TransactItems[2]: Membership item with GSI indexes and without condition
  const membershipPut = items![2].Put!;
  const membershipItem = membershipPut.Item!;
  expect(membershipItem.GSI1PK?.S).toBe('USER#user-123');
  expect(membershipItem.GSI1SK?.S).toMatch(/^WORKSPACE#/);
  expect(membershipPut.ConditionExpression).toBeUndefined();

  // Assert TransactItems[3]: Username reservation with condition
  const reservationPut = items![3].Put!;
  const reservationItem = reservationPut.Item!;
  expect(reservationItem.PK?.S).toBe('USERNAME#jmabrito');
  expect(reservationPut.ConditionExpression).toBe('attribute_not_exists(PK)');
});

test('returns 400 when name is missing', async () => {
  mockGetUserAndWorkspaces.mockResolvedValueOnce(null);

  const result = await handler(mockEvent('user-123', 'jonathan@example.com', { username: 'jmabrito' }), mockLogger);

  expect(result.statusCode).toBe(400);
  expect(JSON.parse(result.body as string)).toEqual({
    error: { code: 'VALIDATION_ERROR', message: 'name is required' },
  });
  expect(ddbMock.commandCalls(GetItemCommand)).toHaveLength(0);
});

test('returns 400 when username is missing', async () => {
  mockGetUserAndWorkspaces.mockResolvedValueOnce(null);

  const result = await handler(mockEvent('user-123', 'jonathan@example.com', { name: 'Jonathan' }), mockLogger);

  expect(result.statusCode).toBe(400);
  expect(JSON.parse(result.body as string)).toEqual({
    error: { code: 'VALIDATION_ERROR', message: 'username is required' },
  });
});

test('returns 400 for a malformed JSON body', async () => {
  mockGetUserAndWorkspaces.mockResolvedValueOnce(null);
  const event = {
    body: '{not valid json',
    requestContext: {
      authorizer: { jwt: { claims: { sub: 'user-123', email: 'jonathan@example.com', email_verified: 'true' }, scopes: null } },
      http: { method: 'POST' },
    },
  } as unknown as APIGatewayProxyEventV2WithJWTAuthorizer;

  const result = await handler(event, mockLogger);

  expect(result.statusCode).toBe(400);
});

test('returns the existing profile as a no-op when already provisioned, ignoring the body', async () => {
  const existing = {
    user: { id: 'user-123', name: 'Jonathan', username: 'jmabrito', email: 'jonathan@example.com', emailVerified: true, preferences: { weightUnit: 'g', temperatureUnit: 'C', lengthUnit: 'm', currency: 'USD', theme: 'dark', defaultEntryMode: 'nfc' }, createdAt: '2026-07-11T00:00:00.000Z' },
    workspaceIds: ['ws-1'],
  };
  mockGetUserAndWorkspaces.mockResolvedValueOnce(existing);
  // Profile item already carries a matching GSI2PK/GSI2SK -- the backfill
  // check must be a genuine no-op (no UpdateItemCommand) in this case.
  ddbMock.on(GetItemCommand).resolves({
    Item: {
      PK: { S: 'USER#user-123' },
      SK: { S: 'PROFILE' },
      GSI2PK: { S: 'EMAIL#jonathan@example.com' },
      GSI2SK: { S: 'PROFILE' },
    },
  });

  const result = await handler(mockEvent('user-123', 'jonathan@example.com', { name: 'ignored', username: 'ignored' }), mockLogger);

  expect(result.statusCode).toBe(200);
  expect(JSON.parse(result.body as string)).toEqual(existing);
  expect(ddbMock.commandCalls(TransactWriteItemsCommand)).toHaveLength(0);
  expect(ddbMock.commandCalls(UpdateItemCommand)).toHaveLength(0);
});

test('backfills a missing GSI2PK/GSI2SK onto an existing pre-existing-feature user profile', async () => {
  const existing = {
    user: { id: 'user-123', name: 'Jonathan', username: 'jmabrito', email: 'jonathan@example.com', emailVerified: true, preferences: { weightUnit: 'g', temperatureUnit: 'C', lengthUnit: 'm', currency: 'USD', theme: 'dark', defaultEntryMode: 'nfc' }, createdAt: '2026-07-11T00:00:00.000Z' },
    workspaceIds: ['ws-1'],
  };
  mockGetUserAndWorkspaces.mockResolvedValueOnce(existing);
  // Profile item predates GSI2 entirely -- no GSI2PK/GSI2SK attributes at all.
  ddbMock.on(GetItemCommand).resolves({
    Item: {
      PK: { S: 'USER#user-123' },
      SK: { S: 'PROFILE' },
      name: { S: 'Jonathan' },
    },
  });
  ddbMock.on(UpdateItemCommand).resolves({});

  const result = await handler(mockEvent('user-123', 'jonathan@example.com', { name: 'ignored', username: 'ignored' }), mockLogger);

  expect(result.statusCode).toBe(200);
  expect(JSON.parse(result.body as string)).toEqual(existing);
  expect(ddbMock.commandCalls(TransactWriteItemsCommand)).toHaveLength(0);
  const updateCall = ddbMock.commandCalls(UpdateItemCommand)[0];
  expect(updateCall.args[0].input).toMatchObject({
    TableName: config.tableName,
    Key: { PK: { S: 'USER#user-123' }, SK: { S: 'PROFILE' } },
    UpdateExpression: 'SET GSI2PK = :gsi2pk, GSI2SK = :gsi2sk',
    ExpressionAttributeValues: {
      ':gsi2pk': { S: 'EMAIL#jonathan@example.com' },
      ':gsi2sk': { S: 'PROFILE' },
    },
    ConditionExpression: 'attribute_exists(PK)',
  });
});

test('returns 409 when the username is already reserved', async () => {
  mockGetUserAndWorkspaces.mockResolvedValueOnce(null);
  ddbMock.on(GetItemCommand).resolves({ Item: { userId: { S: 'other-user' } } });

  const result = await handler(mockEvent('user-123', 'jonathan@example.com', { name: 'Jonathan', username: 'taken' }), mockLogger);

  expect(result.statusCode).toBe(409);
  expect(JSON.parse(result.body as string)).toEqual({
    error: { code: 'USERNAME_TAKEN', message: expect.any(String) },
  });
  expect(ddbMock.commandCalls(TransactWriteItemsCommand)).toHaveLength(0);
});

test('treats different casings of the same username as taken', async () => {
  mockGetUserAndWorkspaces.mockResolvedValueOnce(null);
  ddbMock.on(GetItemCommand).callsFake((input) => {
    if (input.Key.PK.S === 'USERNAME#jonathan') {
      return { Item: { userId: { S: 'other-user' } } };
    }
    return { Item: undefined };
  });

  const result = await handler(mockEvent('user-123', 'jonathan@example.com', { name: 'Jonathan', username: 'Jonathan' }), mockLogger);

  expect(result.statusCode).toBe(409);
});

test('treats a User-condition race as success and returns the winning profile', async () => {
  const winner = {
    user: { id: 'user-123', name: 'Someone Else', username: 'someone', email: 'jonathan@example.com', emailVerified: true, preferences: { weightUnit: 'g', temperatureUnit: 'C', lengthUnit: 'm', currency: 'USD', theme: 'dark', defaultEntryMode: 'nfc' }, createdAt: '2026-07-11T00:00:00.000Z' },
    workspaceIds: ['ws-2'],
  };
  mockGetUserAndWorkspaces
    .mockResolvedValueOnce(null)
    .mockResolvedValueOnce(winner);
  ddbMock.on(GetItemCommand).resolves({ Item: undefined });
  ddbMock.on(TransactWriteItemsCommand).rejects(
    Object.assign(new Error('Transaction cancelled'), {
      name: 'TransactionCanceledException',
      CancellationReasons: [
        { Code: 'ConditionalCheckFailed' },
        { Code: 'None' },
        { Code: 'None' },
        { Code: 'None' },
      ],
    })
  );

  const result = await handler(mockEvent('user-123', 'jonathan@example.com', { name: 'Jonathan', username: 'jmabrito' }), mockLogger);

  expect(result.statusCode).toBe(200);
  expect(JSON.parse(result.body as string)).toEqual(winner);
});

test('treats a reservation-condition race as username taken', async () => {
  mockGetUserAndWorkspaces.mockResolvedValueOnce(null);
  ddbMock.on(GetItemCommand).resolves({ Item: undefined });
  ddbMock.on(TransactWriteItemsCommand).rejects(
    Object.assign(new Error('Transaction cancelled'), {
      name: 'TransactionCanceledException',
      CancellationReasons: [
        { Code: 'None' },
        { Code: 'None' },
        { Code: 'None' },
        { Code: 'ConditionalCheckFailed' },
      ],
    })
  );

  const result = await handler(mockEvent('user-123', 'jonathan@example.com', { name: 'Jonathan', username: 'jmabrito' }), mockLogger);

  expect(result.statusCode).toBe(409);
});
