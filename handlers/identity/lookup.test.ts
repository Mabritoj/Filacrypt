import { mockClient } from 'aws-sdk-client-mock';
import {
  DynamoDBClient,
  BatchWriteItemCommand,
  DeleteItemCommand,
  GetItemCommand,
  QueryCommand,
  TransactWriteItemsCommand,
  UpdateItemCommand,
} from '@aws-sdk/client-dynamodb';
import { config } from 'env-config';
import { getUserAndWorkspaces, updateUserPreferences, deleteUserAccount, getDeletionImpact } from './lookup.js';

const ddbMock = mockClient(DynamoDBClient);

beforeEach(() => ddbMock.reset());

test('returns the mapped profile and workspace ids for a known user', async () => {
  ddbMock.on(GetItemCommand).resolves({
    Item: {
      id: { S: 'user-123' },
      name: { S: 'Jonathan' },
      username: { S: 'jmabrito' },
      email: { S: 'jonathan@example.com' },
      emailVerified: { BOOL: true },
      preferences: {
        M: {
          weightUnit: { S: 'g' },
          temperatureUnit: { S: 'C' },
          lengthUnit: { S: 'm' },
          currency: { S: 'USD' },
          theme: { S: 'dark' },
          defaultEntryMode: { S: 'manual' },
        },
      },
      createdAt: { S: '2026-07-11T00:00:00.000Z' },
    },
  });
  ddbMock.on(QueryCommand).resolves({
    Items: [{ GSI1PK: { S: 'USER#user-123' }, GSI1SK: { S: 'WORKSPACE#ws-1' } }],
  });

  const result = await getUserAndWorkspaces('user-123');

  expect(result).toEqual({
    user: {
      id: 'user-123',
      name: 'Jonathan',
      username: 'jmabrito',
      email: 'jonathan@example.com',
      emailVerified: true,
      avatarUrl: undefined,
      preferences: {
        weightUnit: 'g',
        temperatureUnit: 'C',
        lengthUnit: 'm',
        currency: 'USD',
        theme: 'dark',
        defaultEntryMode: 'manual',
      },
      createdAt: '2026-07-11T00:00:00.000Z',
    },
    workspaceIds: ['ws-1'],
  });

  // Verify GetItemCommand was called with correct input
  expect(ddbMock.commandCalls(GetItemCommand)).toHaveLength(1);
  const getItemCall = ddbMock.commandCalls(GetItemCommand)[0];
  expect(getItemCall.args[0].input).toMatchObject({
    TableName: config.tableName,
    Key: { PK: { S: 'USER#user-123' }, SK: { S: 'PROFILE' } },
  });

  // Verify QueryCommand was called with correct input (GSI1 specifically)
  expect(ddbMock.commandCalls(QueryCommand)).toHaveLength(1);
  const queryCall = ddbMock.commandCalls(QueryCommand)[0];
  expect(queryCall.args[0].input).toMatchObject({
    TableName: config.tableName,
    IndexName: 'GSI1',
    KeyConditionExpression: 'GSI1PK = :userId',
    ExpressionAttributeValues: { ':userId': { S: 'USER#user-123' } },
  });
});

test('defaults defaultEntryMode to nfc for a profile stored before that field existed', async () => {
  ddbMock.on(GetItemCommand).resolves({
    Item: {
      id: { S: 'user-123' },
      name: { S: 'Jonathan' },
      username: { S: 'jmabrito' },
      email: { S: 'jonathan@example.com' },
      emailVerified: { BOOL: true },
      preferences: {
        M: {
          weightUnit: { S: 'g' },
          temperatureUnit: { S: 'C' },
          lengthUnit: { S: 'm' },
          currency: { S: 'USD' },
          theme: { S: 'dark' },
        },
      },
      createdAt: { S: '2026-07-11T00:00:00.000Z' },
    },
  });
  ddbMock.on(QueryCommand).resolves({ Items: [] });

  const result = await getUserAndWorkspaces('user-123');

  expect(result?.user.preferences.defaultEntryMode).toBe('nfc');
});

test('getUserAndWorkspaces returns memberships from every page', async () => {
  ddbMock.on(GetItemCommand).resolves({
    Item: {
      id: { S: 'user-123' },
      name: { S: 'Jonathan' },
      username: { S: 'jmabrito' },
      email: { S: 'jonathan@example.com' },
      emailVerified: { BOOL: true },
      preferences: {
        M: {
          weightUnit: { S: 'g' },
          temperatureUnit: { S: 'C' },
          lengthUnit: { S: 'm' },
          currency: { S: 'USD' },
          theme: { S: 'dark' },
          defaultEntryMode: { S: 'manual' },
        },
      },
      createdAt: { S: '2026-07-11T00:00:00.000Z' },
    },
  });
  ddbMock
    .on(QueryCommand)
    .resolvesOnce({
      Items: [{ GSI1SK: { S: 'WORKSPACE#ws-1' } }],
      LastEvaluatedKey: { PK: { S: 'USER#user-1' }, SK: { S: 'MEMBER#ws-1' } },
    })
    .resolves({ Items: [{ GSI1SK: { S: 'WORKSPACE#ws-2' } }] });

  const result = await getUserAndWorkspaces('user-1');

  expect(result?.workspaceIds).toEqual(['ws-1', 'ws-2']);
});

test('returns null for an unknown user', async () => {
  ddbMock.on(GetItemCommand).resolves({ Item: undefined });

  const result = await getUserAndWorkspaces('unknown-user');

  expect(result).toBeNull();

  // Verify GetItemCommand was called with correct Key for unknown user
  expect(ddbMock.commandCalls(GetItemCommand)).toHaveLength(1);
  const getItemCall = ddbMock.commandCalls(GetItemCommand)[0];
  expect(getItemCall.args[0].input).toMatchObject({
    TableName: config.tableName,
    Key: { PK: { S: 'USER#unknown-user' }, SK: { S: 'PROFILE' } },
  });
});

test('updateUserPreferences applies a partial update and returns the merged profile', async () => {
  ddbMock.on(UpdateItemCommand).resolves({
    Attributes: {
      id: { S: 'user-123' },
      name: { S: 'Jonathan' },
      username: { S: 'jmabrito' },
      email: { S: 'jonathan@example.com' },
      emailVerified: { BOOL: true },
      preferences: {
        M: {
          weightUnit: { S: 'kg' },
          temperatureUnit: { S: 'C' },
          lengthUnit: { S: 'm' },
          currency: { S: 'USD' },
          theme: { S: 'dark' },
          defaultEntryMode: { S: 'nfc' },
        },
      },
      createdAt: { S: '2026-07-11T00:00:00.000Z' },
    },
  });

  const result = await updateUserPreferences('user-123', { weightUnit: 'kg' });

  expect(result?.preferences.weightUnit).toBe('kg');
  const call = ddbMock.commandCalls(UpdateItemCommand)[0];
  expect(call.args[0].input).toMatchObject({
    TableName: config.tableName,
    Key: { PK: { S: 'USER#user-123' }, SK: { S: 'PROFILE' } },
    UpdateExpression: 'SET preferences.#k0 = :v0',
    ExpressionAttributeNames: { '#k0': 'weightUnit' },
    ExpressionAttributeValues: { ':v0': { S: 'kg' } },
    ConditionExpression: 'attribute_exists(PK)',
    ReturnValues: 'ALL_NEW',
  });
});

test('updateUserPreferences returns null when the user does not exist', async () => {
  const conditionalError = Object.assign(new Error('conditional check failed'), {
    name: 'ConditionalCheckFailedException',
  });
  ddbMock.on(UpdateItemCommand).rejects(conditionalError);

  const result = await updateUserPreferences('missing-user', { weightUnit: 'kg' });

  expect(result).toBeNull();
});

describe('deleteUserAccount', () => {
  const USER_ITEM = {
    id: { S: 'user-1' },
    name: { S: 'Jonathan' },
    username: { S: 'jmabrito' },
    email: { S: 'jonathan@example.com' },
    emailVerified: { BOOL: true },
    preferences: { M: { weightUnit: { S: 'g' }, temperatureUnit: { S: 'C' }, lengthUnit: { S: 'm' }, currency: { S: 'USD' }, theme: { S: 'dark' } } },
    createdAt: { S: '2026-07-11T00:00:00.000Z' },
  };

  test('returns false when the user does not exist', async () => {
    ddbMock.on(GetItemCommand).resolves({ Item: undefined });

    const result = await deleteUserAccount('missing-user');

    expect(result).toBe(false);
    expect(ddbMock.commandCalls(QueryCommand)).toHaveLength(0);
  });

  test('cascade-deletes a workspace where the user is the sole member', async () => {
    ddbMock.on(GetItemCommand).resolves({ Item: USER_ITEM });
    ddbMock
      .on(QueryCommand)
      // 1: GSI1 membership list
      .resolvesOnce({ Items: [{ GSI1PK: { S: 'USER#user-1' }, GSI1SK: { S: 'WORKSPACE#ws-1' } }] })
      // 2: member list for ws-1
      .resolvesOnce({ Items: [{ PK: { S: 'WORKSPACE#ws-1' }, SK: { S: 'MEMBER#user-1' }, role: { S: 'owner' } }] })
      // 3: full partition scan for ws-1 (metadata + spools)
      .resolvesOnce({
        Items: [
          { PK: { S: 'WORKSPACE#ws-1' }, SK: { S: 'METADATA' } },
          { PK: { S: 'WORKSPACE#ws-1' }, SK: { S: 'SPOOL#spool-a' } },
          { PK: { S: 'WORKSPACE#ws-1' }, SK: { S: 'MEMBER#user-1' } },
        ],
      })
      // 4: usage events for spool-a
      .resolvesOnce({ Items: [{ PK: { S: 'SPOOL#spool-a' }, SK: { S: 'EVENT#1' } }] });
    ddbMock.on(BatchWriteItemCommand).resolves({});
    ddbMock.on(DeleteItemCommand).resolves({});

    const result = await deleteUserAccount('user-1');

    expect(result).toBe(true);

    const batchCalls = ddbMock.commandCalls(BatchWriteItemCommand);
    expect(batchCalls).toHaveLength(2); // usage events batch, workspace-partition batch
    expect(batchCalls[0].args[0].input.RequestItems![config.tableName]).toEqual([
      { DeleteRequest: { Key: { PK: { S: 'SPOOL#spool-a' }, SK: { S: 'EVENT#1' } } } },
    ]);
    expect(batchCalls[1].args[0].input.RequestItems![config.tableName]).toEqual(
      expect.arrayContaining([
        { DeleteRequest: { Key: { PK: { S: 'WORKSPACE#ws-1' }, SK: { S: 'METADATA' } } } },
        { DeleteRequest: { Key: { PK: { S: 'WORKSPACE#ws-1' }, SK: { S: 'SPOOL#spool-a' } } } },
        { DeleteRequest: { Key: { PK: { S: 'WORKSPACE#ws-1' }, SK: { S: 'MEMBER#user-1' } } } },
      ]),
    );

    const deleteCalls = ddbMock.commandCalls(DeleteItemCommand);
    expect(deleteCalls).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          args: [expect.objectContaining({ input: expect.objectContaining({ Key: { PK: { S: 'USER#user-1' }, SK: { S: 'PROFILE' } } }) })],
        }),
        expect.objectContaining({
          args: [expect.objectContaining({ input: expect.objectContaining({ Key: { PK: { S: 'USERNAME#jmabrito' }, SK: { S: 'RESERVATION' } } }) })],
        }),
      ]),
    );
    expect(ddbMock.commandCalls(UpdateItemCommand)).toHaveLength(0);
  });

  test('retries a cascade batch delete that comes back with UnprocessedItems until it clears', async () => {
    ddbMock.on(GetItemCommand).resolves({ Item: USER_ITEM });
    ddbMock
      .on(QueryCommand)
      .resolvesOnce({ Items: [{ GSI1PK: { S: 'USER#user-1' }, GSI1SK: { S: 'WORKSPACE#ws-1' } }] })
      .resolvesOnce({ Items: [{ PK: { S: 'WORKSPACE#ws-1' }, SK: { S: 'MEMBER#user-1' }, role: { S: 'owner' } }] })
      .resolvesOnce({
        Items: [
          { PK: { S: 'WORKSPACE#ws-1' }, SK: { S: 'METADATA' } },
          { PK: { S: 'WORKSPACE#ws-1' }, SK: { S: 'MEMBER#user-1' } },
        ],
      });
    const unprocessedKey = { PK: { S: 'WORKSPACE#ws-1' }, SK: { S: 'MEMBER#user-1' } };
    ddbMock
      .on(BatchWriteItemCommand)
      .resolvesOnce({
        UnprocessedItems: { [config.tableName]: [{ DeleteRequest: { Key: unprocessedKey } }] },
      })
      .resolves({});
    ddbMock.on(DeleteItemCommand).resolves({});

    const result = await deleteUserAccount('user-1');

    expect(result).toBe(true);
    expect(ddbMock.commandCalls(BatchWriteItemCommand)).toHaveLength(2);
  });

  test('throws when a cascade batch delete keeps coming back with UnprocessedItems', async () => {
    ddbMock.on(GetItemCommand).resolves({ Item: USER_ITEM });
    ddbMock
      .on(QueryCommand)
      .resolvesOnce({ Items: [{ GSI1PK: { S: 'USER#user-1' }, GSI1SK: { S: 'WORKSPACE#ws-1' } }] })
      .resolvesOnce({ Items: [{ PK: { S: 'WORKSPACE#ws-1' }, SK: { S: 'MEMBER#user-1' }, role: { S: 'owner' } }] })
      .resolvesOnce({
        Items: [
          { PK: { S: 'WORKSPACE#ws-1' }, SK: { S: 'METADATA' } },
          { PK: { S: 'WORKSPACE#ws-1' }, SK: { S: 'MEMBER#user-1' } },
        ],
      });
    const unprocessedKey = { PK: { S: 'WORKSPACE#ws-1' }, SK: { S: 'MEMBER#user-1' } };
    ddbMock.on(BatchWriteItemCommand).resolves({
      UnprocessedItems: { [config.tableName]: [{ DeleteRequest: { Key: unprocessedKey } }] },
    });

    await expect(deleteUserAccount('user-1')).rejects.toThrow(/unprocessed/i);
  });

  test('only removes the membership when the user is not the sole member and not the owner', async () => {
    ddbMock.on(GetItemCommand).resolves({ Item: USER_ITEM });
    ddbMock
      .on(QueryCommand)
      .resolvesOnce({ Items: [{ GSI1PK: { S: 'USER#user-1' }, GSI1SK: { S: 'WORKSPACE#ws-1' } }] })
      .resolvesOnce({
        Items: [
          { PK: { S: 'WORKSPACE#ws-1' }, SK: { S: 'MEMBER#user-1' }, role: { S: 'member' } },
          { PK: { S: 'WORKSPACE#ws-1' }, SK: { S: 'MEMBER#user-2' }, role: { S: 'owner' } },
        ],
      });
    ddbMock.on(DeleteItemCommand).resolves({});

    const result = await deleteUserAccount('user-1');

    expect(result).toBe(true);
    expect(ddbMock.commandCalls(BatchWriteItemCommand)).toHaveLength(0);
    expect(ddbMock.commandCalls(UpdateItemCommand)).toHaveLength(0);

    const deleteCalls = ddbMock.commandCalls(DeleteItemCommand);
    const keys = deleteCalls.map((call) => call.args[0].input.Key);
    expect(keys).toEqual(
      expect.arrayContaining([
        { PK: { S: 'WORKSPACE#ws-1' }, SK: { S: 'MEMBER#user-1' } },
        { PK: { S: 'USER#user-1' }, SK: { S: 'PROFILE' } },
        { PK: { S: 'USERNAME#jmabrito' }, SK: { S: 'RESERVATION' } },
      ]),
    );
  });

  test('reassigns ownership to the resolution-supplied newOwnerId when the user is the owner but other members remain', async () => {
    ddbMock.on(GetItemCommand).resolves({ Item: USER_ITEM });
    ddbMock
      .on(QueryCommand)
      .resolvesOnce({ Items: [{ GSI1PK: { S: 'USER#user-1' }, GSI1SK: { S: 'WORKSPACE#ws-1' } }] })
      .resolvesOnce({
        Items: [
          { PK: { S: 'WORKSPACE#ws-1' }, SK: { S: 'MEMBER#user-1' }, role: { S: 'owner' } },
          { PK: { S: 'WORKSPACE#ws-1' }, SK: { S: 'MEMBER#user-2' }, role: { S: 'member' } },
          { PK: { S: 'WORKSPACE#ws-1' }, SK: { S: 'MEMBER#user-3' }, role: { S: 'member' } },
        ],
      });
    ddbMock.on(TransactWriteItemsCommand).resolves({});
    ddbMock.on(DeleteItemCommand).resolves({});

    // Deliberately supply the *second* other member as the new owner -- if the
    // implementation still picked "the first other member found" instead of
    // honoring the resolution, this would assert against user-2 and fail.
    const result = await deleteUserAccount('user-1', {
      'ws-1': { action: 'reassign', newOwnerId: 'user-3' },
    });

    expect(result).toBe(true);
    expect(ddbMock.commandCalls(UpdateItemCommand)).toHaveLength(0);
    const transactCall = ddbMock.commandCalls(TransactWriteItemsCommand)[0];
    const items = transactCall.args[0].input.TransactItems!;
    expect(items).toHaveLength(2);

    // The METADATA.ownerId write.
    expect(items[0].Update).toMatchObject({
      Key: { PK: { S: 'WORKSPACE#ws-1' }, SK: { S: 'METADATA' } },
      UpdateExpression: 'SET ownerId = :newOwnerId',
      ExpressionAttributeValues: { ':newOwnerId': { S: 'user-3' } },
    });

    // The MEMBER# item the authorizer actually reads -- role must move to
    // 'owner' and filamentPermissions must be stripped (owner access is
    // implicit, that field is member-only), conditioned on the member
    // existing so a bogus newOwnerId can't create a phantom item.
    expect(items[1].Update).toMatchObject({
      Key: { PK: { S: 'WORKSPACE#ws-1' }, SK: { S: 'MEMBER#user-3' } },
      UpdateExpression: 'SET #role = :owner REMOVE filamentPermissions',
      ExpressionAttributeNames: { '#role': 'role' },
      ExpressionAttributeValues: { ':owner': { S: 'owner' } },
      ConditionExpression: 'attribute_exists(PK)',
    });

    const deleteCalls = ddbMock.commandCalls(DeleteItemCommand);
    const keys = deleteCalls.map((call) => call.args[0].input.Key);
    expect(keys).toEqual(expect.arrayContaining([{ PK: { S: 'WORKSPACE#ws-1' }, SK: { S: 'MEMBER#user-1' } }]));
  });

  test('fails cleanly (throws, no membership deleted) when reassigning to a nonexistent member', async () => {
    ddbMock.on(GetItemCommand).resolves({ Item: USER_ITEM });
    ddbMock
      .on(QueryCommand)
      .resolvesOnce({ Items: [{ GSI1PK: { S: 'USER#user-1' }, GSI1SK: { S: 'WORKSPACE#ws-1' } }] })
      .resolvesOnce({
        Items: [
          { PK: { S: 'WORKSPACE#ws-1' }, SK: { S: 'MEMBER#user-1' }, role: { S: 'owner' } },
          { PK: { S: 'WORKSPACE#ws-1' }, SK: { S: 'MEMBER#user-2' }, role: { S: 'member' } },
        ],
      });
    ddbMock.on(TransactWriteItemsCommand).rejects(
      Object.assign(new Error('Transaction cancelled'), {
        name: 'TransactionCanceledException',
        CancellationReasons: [{ Code: 'None' }, { Code: 'ConditionalCheckFailed' }],
      }),
    );

    await expect(
      deleteUserAccount('user-1', { 'ws-1': { action: 'reassign', newOwnerId: 'nonexistent-user' } }),
    ).rejects.toThrow('Transaction cancelled');

    expect(ddbMock.commandCalls(DeleteItemCommand)).toHaveLength(0);
  });

  test('deletes the whole workspace when the resolution says so', async () => {
    ddbMock.on(GetItemCommand).resolves({ Item: USER_ITEM });
    ddbMock
      .on(QueryCommand)
      .resolvesOnce({ Items: [{ GSI1PK: { S: 'USER#user-1' }, GSI1SK: { S: 'WORKSPACE#ws-1' } }] })
      .resolvesOnce({
        Items: [
          { PK: { S: 'WORKSPACE#ws-1' }, SK: { S: 'MEMBER#user-1' }, role: { S: 'owner' } },
          { PK: { S: 'WORKSPACE#ws-1' }, SK: { S: 'MEMBER#user-2' }, role: { S: 'member' } },
        ],
      })
      .resolvesOnce({
        Items: [
          { PK: { S: 'WORKSPACE#ws-1' }, SK: { S: 'METADATA' } },
          { PK: { S: 'WORKSPACE#ws-1' }, SK: { S: 'MEMBER#user-1' } },
          { PK: { S: 'WORKSPACE#ws-1' }, SK: { S: 'MEMBER#user-2' } },
        ],
      });
    ddbMock.on(BatchWriteItemCommand).resolves({});
    ddbMock.on(DeleteItemCommand).resolves({});

    const result = await deleteUserAccount('user-1', { 'ws-1': { action: 'delete' } });

    expect(result).toBe(true);
    expect(ddbMock.commandCalls(UpdateItemCommand)).toHaveLength(0);

    const batchCalls = ddbMock.commandCalls(BatchWriteItemCommand);
    expect(batchCalls).toHaveLength(1);
    expect(batchCalls[0].args[0].input.RequestItems![config.tableName]).toEqual(
      expect.arrayContaining([
        { DeleteRequest: { Key: { PK: { S: 'WORKSPACE#ws-1' }, SK: { S: 'METADATA' } } } },
        { DeleteRequest: { Key: { PK: { S: 'WORKSPACE#ws-1' }, SK: { S: 'MEMBER#user-1' } } } },
        { DeleteRequest: { Key: { PK: { S: 'WORKSPACE#ws-1' }, SK: { S: 'MEMBER#user-2' } } } },
      ]),
    );
  });

  test('throws when an owned multi-member workspace has no resolution', async () => {
    ddbMock.on(GetItemCommand).resolves({ Item: USER_ITEM });
    ddbMock
      .on(QueryCommand)
      .resolvesOnce({ Items: [{ GSI1PK: { S: 'USER#user-1' }, GSI1SK: { S: 'WORKSPACE#ws-1' } }] })
      .resolvesOnce({
        Items: [
          { PK: { S: 'WORKSPACE#ws-1' }, SK: { S: 'MEMBER#user-1' }, role: { S: 'owner' } },
          { PK: { S: 'WORKSPACE#ws-1' }, SK: { S: 'MEMBER#user-2' }, role: { S: 'member' } },
        ],
      });

    await expect(deleteUserAccount('user-1')).rejects.toThrow(
      'No resolution supplied for owned workspace ws-1',
    );

    expect(ddbMock.commandCalls(UpdateItemCommand)).toHaveLength(0);
    expect(ddbMock.commandCalls(DeleteItemCommand)).toHaveLength(0);
  });
});

describe('getDeletionImpact', () => {
  test('omits workspaces the caller owns alone', async () => {
    ddbMock
      .on(QueryCommand)
      .resolvesOnce({ Items: [{ GSI1PK: { S: 'USER#user-1' }, GSI1SK: { S: 'WORKSPACE#ws-1' } }] })
      .resolvesOnce({
        Items: [{ PK: { S: 'WORKSPACE#ws-1' }, SK: { S: 'MEMBER#user-1' }, role: { S: 'owner' } }],
      });

    const result = await getDeletionImpact('user-1');

    expect(result).toEqual([]);
    expect(ddbMock.commandCalls(GetItemCommand)).toHaveLength(0);
  });

  test('omits workspaces the caller does not own', async () => {
    ddbMock
      .on(QueryCommand)
      .resolvesOnce({ Items: [{ GSI1PK: { S: 'USER#user-1' }, GSI1SK: { S: 'WORKSPACE#ws-1' } }] })
      .resolvesOnce({
        Items: [
          { PK: { S: 'WORKSPACE#ws-1' }, SK: { S: 'MEMBER#user-1' }, role: { S: 'member' } },
          { PK: { S: 'WORKSPACE#ws-1' }, SK: { S: 'MEMBER#user-2' }, role: { S: 'owner' } },
          { PK: { S: 'WORKSPACE#ws-1' }, SK: { S: 'MEMBER#user-3' }, role: { S: 'member' } },
        ],
      });

    const result = await getDeletionImpact('user-1');

    expect(result).toEqual([]);
    expect(ddbMock.commandCalls(GetItemCommand)).toHaveLength(0);
  });

  test('includes an owned multi-member workspace with the other members listed', async () => {
    ddbMock
      .on(QueryCommand)
      .resolvesOnce({ Items: [{ GSI1PK: { S: 'USER#user-1' }, GSI1SK: { S: 'WORKSPACE#ws-1' } }] })
      .resolvesOnce({
        Items: [
          { PK: { S: 'WORKSPACE#ws-1' }, SK: { S: 'MEMBER#user-1' }, role: { S: 'owner' } },
          { PK: { S: 'WORKSPACE#ws-1' }, SK: { S: 'MEMBER#user-2' }, role: { S: 'member' } },
          { PK: { S: 'WORKSPACE#ws-1' }, SK: { S: 'MEMBER#user-3' }, role: { S: 'admin' } },
        ],
      });
    ddbMock
      .on(GetItemCommand, { Key: { PK: { S: 'WORKSPACE#ws-1' }, SK: { S: 'METADATA' } } })
      .resolves({ Item: { name: { S: 'Shop' } } });
    ddbMock
      .on(GetItemCommand, { Key: { PK: { S: 'USER#user-2' }, SK: { S: 'PROFILE' } } })
      .resolves({ Item: { name: { S: 'Grace' } } });
    ddbMock
      .on(GetItemCommand, { Key: { PK: { S: 'USER#user-3' }, SK: { S: 'PROFILE' } } })
      .resolves({ Item: { name: { S: 'Ada' } } });

    const result = await getDeletionImpact('user-1');

    expect(result).toEqual([
      {
        workspaceId: 'ws-1',
        name: 'Shop',
        members: expect.arrayContaining([
          { userId: 'user-2', name: 'Grace', role: 'member' },
          { userId: 'user-3', name: 'Ada', role: 'admin' },
        ]),
      },
    ]);
    expect(result[0].members).toHaveLength(2);
    expect(result[0].members.some((member) => member.userId === 'user-1')).toBe(false);
  });
});
