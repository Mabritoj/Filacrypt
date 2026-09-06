import { mockClient } from 'aws-sdk-client-mock';
import { DynamoDBDocumentClient, GetCommand, PutCommand, QueryCommand, DeleteCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { config } from 'env-config';
import { listMembers, findUserByEmail, addMember, updateMemberRole, updateMemberPermissions, removeMember } from './members-lookup.js';

const ddbMock = mockClient(DynamoDBDocumentClient);

beforeEach(() => ddbMock.reset());

describe('listMembers', () => {
  test('joins each MEMBER# item with its USER# profile', async () => {
    ddbMock.on(QueryCommand).resolves({
      Items: [
        { PK: 'WORKSPACE#ws-1', SK: 'MEMBER#user-1', role: 'owner', joinedAt: '2026-01-01T00:00:00.000Z' },
      ],
    });
    ddbMock.on(GetCommand).resolves({ Item: { name: 'Ada', email: 'ada@example.com' } });

    await expect(listMembers('ws-1')).resolves.toEqual([
      {
        userId: 'user-1',
        name: 'Ada',
        email: 'ada@example.com',
        role: 'owner',
        filamentPermissions: undefined,
        joinedAt: '2026-01-01T00:00:00.000Z',
      },
    ]);

    const queryCall = ddbMock.commandCalls(QueryCommand)[0];
    expect(queryCall.args[0].input).toMatchObject({
      TableName: config.tableName,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :skPrefix)',
      ExpressionAttributeValues: { ':pk': 'WORKSPACE#ws-1', ':skPrefix': 'MEMBER#' },
    });
  });

  test('falls back to a placeholder name when the profile lookup misses', async () => {
    ddbMock.on(QueryCommand).resolves({
      Items: [{ PK: 'WORKSPACE#ws-1', SK: 'MEMBER#user-1', role: 'member', joinedAt: '2026-01-01T00:00:00.000Z' }],
    });
    ddbMock.on(GetCommand).resolves({ Item: undefined });

    const [member] = await listMembers('ws-1');
    expect(member.name).toBe('Unknown user');
    expect(member.email).toBe('');
  });
});

describe('findUserByEmail', () => {
  test('queries GSI2 by lowercased email', async () => {
    ddbMock.on(QueryCommand).resolves({ Items: [{ id: 'user-1', name: 'Ada', email: 'ada@example.com' }] });

    await expect(findUserByEmail('Ada@Example.com')).resolves.toEqual({
      id: 'user-1',
      name: 'Ada',
      email: 'ada@example.com',
    });

    const call = ddbMock.commandCalls(QueryCommand)[0];
    expect(call.args[0].input).toMatchObject({
      IndexName: 'GSI2',
      KeyConditionExpression: 'GSI2PK = :email',
      ExpressionAttributeValues: { ':email': 'EMAIL#ada@example.com' },
    });
  });

  test('returns null when no user has that email', async () => {
    ddbMock.on(QueryCommand).resolves({ Items: [] });

    await expect(findUserByEmail('nobody@example.com')).resolves.toBeNull();
  });
});

describe('addMember', () => {
  test('writes a member-role item with all filamentPermissions false, and returns the written fields', async () => {
    ddbMock.on(PutCommand).resolves({});

    const result = await addMember('ws-1', 'user-2');

    const call = ddbMock.commandCalls(PutCommand)[0];
    expect(call.args[0].input.Item).toMatchObject({
      PK: 'WORKSPACE#ws-1',
      SK: 'MEMBER#user-2',
      GSI1PK: 'USER#user-2',
      GSI1SK: 'WORKSPACE#ws-1',
      role: 'member',
      filamentPermissions: { create: false, read: false, update: false, delete: false },
    });
    // The write's own return value must let the caller (members/invite.ts)
    // build the response directly, with no listMembers() re-query.
    expect(result).toEqual({
      role: 'member',
      filamentPermissions: { create: false, read: false, update: false, delete: false },
      joinedAt: expect.any(String),
    });
  });

  test('rejects when the user is already a member', async () => {
    const err = Object.assign(new Error('conditional check failed'), { name: 'ConditionalCheckFailedException' });
    ddbMock.on(PutCommand).rejects(err);

    await expect(addMember('ws-1', 'user-2')).rejects.toThrow('conditional check failed');
  });
});

describe('updateMemberRole', () => {
  test('updates the role and returns the updated member, built from ALL_NEW -- no re-query', async () => {
    ddbMock.on(UpdateCommand).resolves({
      Attributes: { role: 'admin', joinedAt: '2026-01-01T00:00:00.000Z' },
    });
    ddbMock.on(GetCommand).resolves({ Item: { name: 'Grace', email: 'grace@example.com' } });

    await expect(updateMemberRole('ws-1', 'user-2', 'admin')).resolves.toEqual({
      userId: 'user-2',
      name: 'Grace',
      email: 'grace@example.com',
      role: 'admin',
      filamentPermissions: undefined,
      joinedAt: '2026-01-01T00:00:00.000Z',
    });

    const call = ddbMock.commandCalls(UpdateCommand)[0];
    expect(call.args[0].input).toMatchObject({
      Key: { PK: 'WORKSPACE#ws-1', SK: 'MEMBER#user-2' },
      ExpressionAttributeValues: { ':role': 'admin' },
      ConditionExpression: 'attribute_exists(PK)',
      ReturnValues: 'ALL_NEW',
    });
  });

  test('returns null when the target is not a member', async () => {
    ddbMock.on(UpdateCommand).rejects(Object.assign(new Error('x'), { name: 'ConditionalCheckFailedException' }));

    await expect(updateMemberRole('ws-1', 'user-2', 'admin')).resolves.toBeNull();
  });
});

describe('updateMemberPermissions', () => {
  test('sets only the provided keys and returns the updated member, built from ALL_NEW -- no re-query', async () => {
    ddbMock.on(UpdateCommand).resolves({
      Attributes: { role: 'member', filamentPermissions: { read: true }, joinedAt: '2026-01-01T00:00:00.000Z' },
    });
    ddbMock.on(GetCommand).resolves({ Item: { name: 'Grace', email: 'grace@example.com' } });

    await expect(updateMemberPermissions('ws-1', 'user-2', { read: true })).resolves.toEqual({
      userId: 'user-2',
      name: 'Grace',
      email: 'grace@example.com',
      role: 'member',
      filamentPermissions: { read: true },
      joinedAt: '2026-01-01T00:00:00.000Z',
    });

    const call = ddbMock.commandCalls(UpdateCommand)[0];
    expect(call.args[0].input.UpdateExpression).toContain('filamentPermissions.#k0 = :v0');
    expect(call.args[0].input.ExpressionAttributeValues).toEqual({ ':v0': true });
    expect(call.args[0].input.ReturnValues).toBe('ALL_NEW');
  });

  test('returns null when the target is not a member', async () => {
    ddbMock.on(UpdateCommand).rejects(Object.assign(new Error('x'), { name: 'ConditionalCheckFailedException' }));

    await expect(updateMemberPermissions('ws-1', 'user-2', { read: true })).resolves.toBeNull();
  });

  test('with nothing to update, fetches and returns the current member without calling UpdateCommand', async () => {
    ddbMock.on(GetCommand).resolves({
      Item: { role: 'member', filamentPermissions: { read: true }, joinedAt: '2026-01-01T00:00:00.000Z', name: 'Grace', email: 'grace@example.com' },
    });

    await expect(updateMemberPermissions('ws-1', 'user-2', {})).resolves.toEqual({
      userId: 'user-2',
      name: 'Grace',
      email: 'grace@example.com',
      role: 'member',
      filamentPermissions: { read: true },
      joinedAt: '2026-01-01T00:00:00.000Z',
    });
    expect(ddbMock.commandCalls(UpdateCommand)).toHaveLength(0);
  });

  test('with nothing to update, returns null when the target is not a member', async () => {
    ddbMock.on(GetCommand).resolves({ Item: undefined });

    await expect(updateMemberPermissions('ws-1', 'user-2', {})).resolves.toBeNull();
  });
});

describe('removeMember', () => {
  test('deletes the member item and returns true', async () => {
    ddbMock.on(DeleteCommand).resolves({});

    await expect(removeMember('ws-1', 'user-2')).resolves.toBe(true);

    const call = ddbMock.commandCalls(DeleteCommand)[0];
    expect(call.args[0].input).toMatchObject({
      Key: { PK: 'WORKSPACE#ws-1', SK: 'MEMBER#user-2' },
      ConditionExpression: 'attribute_exists(PK)',
    });
  });

  test('returns false when the target is not a member', async () => {
    ddbMock.on(DeleteCommand).rejects(Object.assign(new Error('x'), { name: 'ConditionalCheckFailedException' }));

    await expect(removeMember('ws-1', 'user-2')).resolves.toBe(false);
  });
});
