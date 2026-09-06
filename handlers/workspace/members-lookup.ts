import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, PutCommand, DeleteCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { config } from 'env-config';
import { queryAll } from 'dynamo-utils';
import type { Role, FilamentPermissions } from 'workspace-auth';

const ddbClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));

export interface WorkspaceMember {
  userId: string;
  name: string;
  email: string;
  role: Role;
  filamentPermissions?: FilamentPermissions;
  joinedAt: string;
}

const DEFAULT_FILAMENT_PERMISSIONS: FilamentPermissions = {
  create: false,
  read: false,
  update: false,
  delete: false,
};

/**
 * Joins a raw MEMBER# item (from a Query, or the ALL_NEW result of an
 * Update) with its USER# profile for the name/email fields. Shared by
 * listMembers and by the single-member update functions below so a
 * role/permissions change can return the updated member directly from the
 * write instead of re-querying the whole roster (see members/role.ts and
 * members/permissions.ts -- re-querying via listMembers right after a write
 * is an eventually-consistent Query and can race the write itself).
 */
async function hydrateMember(userId: string, item: Record<string, unknown>): Promise<WorkspaceMember> {
  const profile = await ddbClient.send(
    new GetCommand({ TableName: config.tableName, Key: { PK: `USER#${userId}`, SK: 'PROFILE' } }),
  );
  return {
    userId,
    name: (profile.Item?.name as string) ?? 'Unknown user',
    email: (profile.Item?.email as string) ?? '',
    role: item.role as Role,
    filamentPermissions: item.filamentPermissions as FilamentPermissions | undefined,
    joinedAt: item.joinedAt as string,
  };
}

export async function listMembers(workspaceId: string): Promise<WorkspaceMember[]> {
  const items = await queryAll(ddbClient, {
    TableName: config.tableName,
    KeyConditionExpression: 'PK = :pk AND begins_with(SK, :skPrefix)',
    ExpressionAttributeValues: { ':pk': `WORKSPACE#${workspaceId}`, ':skPrefix': 'MEMBER#' },
  });

  return Promise.all(
    items.map((item) => hydrateMember((item.SK as string).replace('MEMBER#', ''), item)),
  );
}

/** GSI2 is claimed by this feature for email lookup: GSI2PK: EMAIL#{lowercased email}, GSI2SK: PROFILE. */
export async function findUserByEmail(email: string): Promise<{ id: string; name: string; email: string } | null> {
  const items = await queryAll(ddbClient, {
    TableName: config.tableName,
    IndexName: 'GSI2',
    KeyConditionExpression: 'GSI2PK = :email',
    ExpressionAttributeValues: { ':email': `EMAIL#${email.toLowerCase()}` },
  });

  if (items.length === 0) return null;
  return {
    id: items[0].id as string,
    name: items[0].name as string,
    email: (items[0].email as string) ?? '',
  };
}

/**
 * Returns just the fields this write itself set -- not the full
 * WorkspaceMember -- so the caller (members/invite.ts) can build the
 * response directly from this plus the name/email findUserByEmail already
 * returned, without a separate listMembers() re-query.
 */
export async function addMember(
  workspaceId: string,
  userId: string,
): Promise<{ role: 'member'; filamentPermissions: FilamentPermissions; joinedAt: string }> {
  const now = new Date().toISOString();
  await ddbClient.send(
    new PutCommand({
      TableName: config.tableName,
      Item: {
        PK: `WORKSPACE#${workspaceId}`,
        SK: `MEMBER#${userId}`,
        type: 'MEMBERSHIP',
        GSI1PK: `USER#${userId}`,
        GSI1SK: `WORKSPACE#${workspaceId}`,
        role: 'member',
        filamentPermissions: DEFAULT_FILAMENT_PERMISSIONS,
        joinedAt: now,
      },
      ConditionExpression: 'attribute_not_exists(PK)',
    }),
  );
  return { role: 'member', filamentPermissions: DEFAULT_FILAMENT_PERMISSIONS, joinedAt: now };
}

export async function updateMemberRole(
  workspaceId: string,
  userId: string,
  role: 'admin' | 'member',
): Promise<WorkspaceMember | null> {
  try {
    const result = await ddbClient.send(
      new UpdateCommand({
        TableName: config.tableName,
        Key: { PK: `WORKSPACE#${workspaceId}`, SK: `MEMBER#${userId}` },
        UpdateExpression: 'SET #role = :role',
        ExpressionAttributeNames: { '#role': 'role' },
        ExpressionAttributeValues: { ':role': role },
        ConditionExpression: 'attribute_exists(PK)',
        ReturnValues: 'ALL_NEW',
      }),
    );
    return await hydrateMember(userId, result.Attributes!);
  } catch (err) {
    if ((err as { name?: string }).name === 'ConditionalCheckFailedException') return null;
    throw err;
  }
}

export async function updateMemberPermissions(
  workspaceId: string,
  userId: string,
  updates: Partial<FilamentPermissions>,
): Promise<WorkspaceMember | null> {
  const keys = Object.keys(updates) as (keyof FilamentPermissions)[];

  if (keys.length === 0) {
    // Nothing to change, but the caller still needs the current member back.
    const existing = await ddbClient.send(
      new GetCommand({ TableName: config.tableName, Key: { PK: `WORKSPACE#${workspaceId}`, SK: `MEMBER#${userId}` } }),
    );
    if (!existing.Item) return null;
    return hydrateMember(userId, existing.Item);
  }

  try {
    const result = await ddbClient.send(
      new UpdateCommand({
        TableName: config.tableName,
        Key: { PK: `WORKSPACE#${workspaceId}`, SK: `MEMBER#${userId}` },
        UpdateExpression: `SET ${keys.map((_key, i) => `filamentPermissions.#k${i} = :v${i}`).join(', ')}`,
        ExpressionAttributeNames: Object.fromEntries(keys.map((key, i) => [`#k${i}`, key])),
        ExpressionAttributeValues: Object.fromEntries(keys.map((key, i) => [`:v${i}`, updates[key]])),
        ConditionExpression: 'attribute_exists(PK)',
        ReturnValues: 'ALL_NEW',
      }),
    );
    return await hydrateMember(userId, result.Attributes!);
  } catch (err) {
    if ((err as { name?: string }).name === 'ConditionalCheckFailedException') return null;
    throw err;
  }
}

export async function removeMember(workspaceId: string, userId: string): Promise<boolean> {
  try {
    await ddbClient.send(
      new DeleteCommand({
        TableName: config.tableName,
        Key: { PK: `WORKSPACE#${workspaceId}`, SK: `MEMBER#${userId}` },
        ConditionExpression: 'attribute_exists(PK)',
      }),
    );
    return true;
  } catch (err) {
    if ((err as { name?: string }).name === 'ConditionalCheckFailedException') return false;
    throw err;
  }
}
