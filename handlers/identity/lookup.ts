import {
  DynamoDBClient,
  BatchWriteItemCommand,
  DeleteItemCommand,
  GetItemCommand,
  QueryCommand,
  TransactWriteItemsCommand,
  UpdateItemCommand,
  type AttributeValue,
  type QueryCommandInput,
} from '@aws-sdk/client-dynamodb';
import { config } from 'env-config';

const ddbClient = new DynamoDBClient({});

/**
 * Low-level equivalent of handlers/workspace/paginate.ts. Kept local because
 * this module uses the raw DynamoDBClient, whose items are AttributeValue maps
 * rather than the plain objects the document client returns.
 */
async function queryAllRaw(
  input: QueryCommandInput,
): Promise<Record<string, AttributeValue>[]> {
  const items: Record<string, AttributeValue>[] = [];
  let cursor: Record<string, AttributeValue> | undefined;

  do {
    const result = await ddbClient.send(
      new QueryCommand({ ...input, ExclusiveStartKey: cursor }),
    );
    items.push(...(result.Items ?? []));
    cursor = result.LastEvaluatedKey;
  } while (cursor);

  return items;
}

export interface UserProfile {
  id: string;
  name: string;
  username: string;
  email: string;
  emailVerified: boolean;
  avatarUrl?: string;
  preferences: {
    weightUnit: string;
    temperatureUnit: string;
    lengthUnit: string;
    currency: string;
    theme: string;
    defaultEntryMode: string;
  };
  createdAt: string;
}

export interface UserAndWorkspaces {
  user: UserProfile;
  workspaceIds: string[];
}

function mapItemToUserProfile(item: Record<string, AttributeValue>): UserProfile {
  return {
    id: item.id.S!,
    name: item.name.S!,
    username: item.username.S!,
    email: item.email.S!,
    emailVerified: item.emailVerified.BOOL!,
    avatarUrl: item.avatarUrl?.S,
    preferences: {
      weightUnit: item.preferences.M!.weightUnit.S!,
      temperatureUnit: item.preferences.M!.temperatureUnit.S!,
      lengthUnit: item.preferences.M!.lengthUnit.S!,
      currency: item.preferences.M!.currency.S!,
      theme: item.preferences.M!.theme.S!,
      defaultEntryMode: item.preferences.M!.defaultEntryMode?.S ?? 'nfc',
    },
    createdAt: item.createdAt.S!,
  };
}

export async function getUserAndWorkspaces(userId: string): Promise<UserAndWorkspaces | null> {
  const userResult = await ddbClient.send(new GetItemCommand({
    TableName: config.tableName,
    Key: { PK: { S: `USER#${userId}` }, SK: { S: 'PROFILE' } },
  }));

  if (!userResult.Item) {
    return null;
  }

  const membershipItems = await queryAllRaw({
    TableName: config.tableName,
    IndexName: 'GSI1',
    KeyConditionExpression: 'GSI1PK = :userId',
    ExpressionAttributeValues: { ':userId': { S: `USER#${userId}` } },
  });

  const workspaceIds = membershipItems.map(
    (item) => item.GSI1SK.S!.replace('WORKSPACE#', ''),
  );

  return {
    user: mapItemToUserProfile(userResult.Item),
    workspaceIds,
  };
}

export async function updateUserPreferences(
  userId: string,
  updates: Partial<UserProfile['preferences']>,
): Promise<UserProfile | null> {
  const keys = Object.keys(updates) as (keyof UserProfile['preferences'])[];
  if (keys.length === 0) {
    const existing = await getUserAndWorkspaces(userId);
    return existing?.user ?? null;
  }

  try {
    const result = await ddbClient.send(new UpdateItemCommand({
      TableName: config.tableName,
      Key: { PK: { S: `USER#${userId}` }, SK: { S: 'PROFILE' } },
      UpdateExpression: `SET ${keys.map((_key, i) => `preferences.#k${i} = :v${i}`).join(', ')}`,
      ExpressionAttributeNames: Object.fromEntries(keys.map((key, i) => [`#k${i}`, key])),
      ExpressionAttributeValues: Object.fromEntries(keys.map((key, i) => [`:v${i}`, { S: updates[key] as string }])),
      ConditionExpression: 'attribute_exists(PK)',
      ReturnValues: 'ALL_NEW',
    }));

    return mapItemToUserProfile(result.Attributes!);
  } catch (err) {
    if ((err as { name?: string }).name === 'ConditionalCheckFailedException') {
      return null;
    }
    throw err;
  }
}

const BATCH_WRITE_LIMIT = 25;

async function batchDeleteKeys(keys: { PK: AttributeValue; SK: AttributeValue }[]): Promise<void> {
  for (let i = 0; i < keys.length; i += BATCH_WRITE_LIMIT) {
    const batch = keys.slice(i, i + BATCH_WRITE_LIMIT);
    await ddbClient.send(new BatchWriteItemCommand({
      RequestItems: {
        [config.tableName]: batch.map((key) => ({ DeleteRequest: { Key: key } })),
      },
    }));
  }
}

async function deleteSpoolUsageEvents(spoolId: string): Promise<void> {
  const events = await queryAllRaw({
    TableName: config.tableName,
    KeyConditionExpression: 'PK = :pk',
    ExpressionAttributeValues: { ':pk': { S: `SPOOL#${spoolId}` } },
  });
  const keys = events.map((item) => ({ PK: item.PK, SK: item.SK }));
  if (keys.length > 0) {
    await batchDeleteKeys(keys);
  }
}

async function deleteWorkspaceCascade(workspaceId: string): Promise<void> {
  const items = await queryAllRaw({
    TableName: config.tableName,
    KeyConditionExpression: 'PK = :pk',
    ExpressionAttributeValues: { ':pk': { S: `WORKSPACE#${workspaceId}` } },
  });

  const spoolIds = items
    .filter((item) => item.SK.S!.startsWith('SPOOL#'))
    .map((item) => item.SK.S!.replace('SPOOL#', ''));

  for (const spoolId of spoolIds) {
    await deleteSpoolUsageEvents(spoolId);
  }

  await batchDeleteKeys(items.map((item) => ({ PK: item.PK, SK: item.SK })));
}

export type WorkspaceResolution = { action: 'reassign'; newOwnerId: string } | { action: 'delete' };

export interface DeletionImpactWorkspace {
  workspaceId: string;
  name: string;
  members: { userId: string; name: string; role: string }[];
}

export async function getDeletionImpact(userId: string): Promise<DeletionImpactWorkspace[]> {
  const membershipItems = await queryAllRaw({
    TableName: config.tableName,
    IndexName: 'GSI1',
    KeyConditionExpression: 'GSI1PK = :userId',
    ExpressionAttributeValues: { ':userId': { S: `USER#${userId}` } },
  });

  const result: DeletionImpactWorkspace[] = [];

  for (const item of membershipItems) {
    const workspaceId = item.GSI1SK.S!.replace('WORKSPACE#', '');
    const members = await queryAllRaw({
      TableName: config.tableName,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :skPrefix)',
      ExpressionAttributeValues: { ':pk': { S: `WORKSPACE#${workspaceId}` }, ':skPrefix': { S: 'MEMBER#' } },
    });

    const thisMember = members.find((member) => member.SK.S === `MEMBER#${userId}`);
    if (thisMember?.role?.S !== 'owner' || members.length <= 1) continue;

    const workspaceResult = await ddbClient.send(
      new GetItemCommand({
        TableName: config.tableName,
        Key: { PK: { S: `WORKSPACE#${workspaceId}` }, SK: { S: 'METADATA' } },
      }),
    );

    const otherMembers = await Promise.all(
      members
        .filter((member) => member.SK.S !== `MEMBER#${userId}`)
        .map(async (member) => {
          const memberUserId = member.SK.S!.replace('MEMBER#', '');
          const profile = await ddbClient.send(
            new GetItemCommand({
              TableName: config.tableName,
              Key: { PK: { S: `USER#${memberUserId}` }, SK: { S: 'PROFILE' } },
            }),
          );
          return {
            userId: memberUserId,
            name: profile.Item?.name.S ?? 'Unknown user',
            role: member.role.S!,
          };
        }),
    );

    result.push({
      workspaceId,
      name: workspaceResult.Item?.name.S ?? 'Workspace',
      members: otherMembers,
    });
  }

  return result;
}

/**
 * The permission authorizer (handlers/permission-authorizer/index.ts) reads
 * ONLY the new owner's MEMBER#.role -- it never consults METADATA.ownerId.
 * Moving just METADATA.ownerId (as this used to do) leaves the "new owner"
 * with role: 'member' and no filamentPermissions, which permanently locks
 * them out of their own workspace (ownerOnly denies everyone once no member
 * has role: 'owner', so it can never be fixed via the API). Both writes go
 * in a single transaction so they can never diverge; the member-item update
 * is conditioned on attribute_exists(PK) so a nonexistent newOwnerId fails
 * the whole transaction cleanly instead of creating a phantom item.
 * filamentPermissions is removed, not just left in place, because owner
 * access is implicit/full -- that field is member-role-only.
 */
async function reassignWorkspaceOwner(workspaceId: string, newOwnerId: string): Promise<void> {
  await ddbClient.send(new TransactWriteItemsCommand({
    TransactItems: [
      {
        Update: {
          TableName: config.tableName,
          Key: { PK: { S: `WORKSPACE#${workspaceId}` }, SK: { S: 'METADATA' } },
          UpdateExpression: 'SET ownerId = :newOwnerId',
          ExpressionAttributeValues: { ':newOwnerId': { S: newOwnerId } },
        },
      },
      {
        Update: {
          TableName: config.tableName,
          Key: { PK: { S: `WORKSPACE#${workspaceId}` }, SK: { S: `MEMBER#${newOwnerId}` } },
          UpdateExpression: 'SET #role = :owner REMOVE filamentPermissions',
          ExpressionAttributeNames: { '#role': 'role' },
          ExpressionAttributeValues: { ':owner': { S: 'owner' } },
          ConditionExpression: 'attribute_exists(PK)',
        },
      },
    ],
  }));
}

async function leaveWorkspace(
  userId: string,
  workspaceId: string,
  resolution?: WorkspaceResolution,
): Promise<void> {
  const members = await queryAllRaw({
    TableName: config.tableName,
    KeyConditionExpression: 'PK = :pk AND begins_with(SK, :skPrefix)',
    ExpressionAttributeValues: {
      ':pk': { S: `WORKSPACE#${workspaceId}` },
      ':skPrefix': { S: 'MEMBER#' },
    },
  });

  if (members.length <= 1) {
    await deleteWorkspaceCascade(workspaceId);
    return;
  }

  const thisMember = members.find((member) => member.SK.S === `MEMBER#${userId}`);
  if (thisMember?.role?.S === 'owner') {
    if (!resolution) {
      // Unreachable via the API -- me-delete.ts validates every owned
      // multi-member workspace has a resolution before calling
      // deleteUserAccount at all. A thrown error here (rather than silently
      // picking a fallback owner) is the correct failure mode if that
      // invariant is ever violated by a future caller.
      throw new Error(`No resolution supplied for owned workspace ${workspaceId}`);
    }
    if (resolution.action === 'delete') {
      await deleteWorkspaceCascade(workspaceId);
      return;
    }
    await reassignWorkspaceOwner(workspaceId, resolution.newOwnerId);
  }

  await ddbClient.send(new DeleteItemCommand({
    TableName: config.tableName,
    Key: { PK: { S: `WORKSPACE#${workspaceId}` }, SK: { S: `MEMBER#${userId}` } },
  }));
}

export async function deleteUserAccount(
  userId: string,
  workspaceResolutions: Record<string, WorkspaceResolution> = {},
): Promise<boolean> {
  const userResult = await ddbClient.send(new GetItemCommand({
    TableName: config.tableName,
    Key: { PK: { S: `USER#${userId}` }, SK: { S: 'PROFILE' } },
  }));
  if (!userResult.Item) {
    return false;
  }
  const username = userResult.Item.username.S!;

  const membershipItems = await queryAllRaw({
    TableName: config.tableName,
    IndexName: 'GSI1',
    KeyConditionExpression: 'GSI1PK = :userId',
    ExpressionAttributeValues: { ':userId': { S: `USER#${userId}` } },
  });
  const workspaceIds = membershipItems.map(
    (item) => item.GSI1SK.S!.replace('WORKSPACE#', ''),
  );

  for (const workspaceId of workspaceIds) {
    await leaveWorkspace(userId, workspaceId, workspaceResolutions[workspaceId]);
  }

  await ddbClient.send(new DeleteItemCommand({
    TableName: config.tableName,
    Key: { PK: { S: `USER#${userId}` }, SK: { S: 'PROFILE' } },
  }));
  await ddbClient.send(new DeleteItemCommand({
    TableName: config.tableName,
    Key: { PK: { S: `USERNAME#${username.toLowerCase()}` }, SK: { S: 'RESERVATION' } },
  }));

  return true;
}
