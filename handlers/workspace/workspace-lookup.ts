import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { config } from 'env-config';
import { omitDynamoKeys } from 'dynamo-utils';

const ddbClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));

export interface Workspace {
  id: string;
  name: string;
  ownerId: string;
  lowStockThresholdG: number;
  defaultDiameterMm: number;
  defaultEmptySpoolWeightG: number;
  defaultPrinterId?: string;
  createdAt: string;
}

export type UpdateWorkspaceInput = Partial<
  Pick<Workspace, 'lowStockThresholdG' | 'defaultDiameterMm' | 'defaultEmptySpoolWeightG' | 'defaultPrinterId'>
>;

const WORKSPACE_DEFAULTS = {
  lowStockThresholdG: 200,
  defaultDiameterMm: 1.75,
  defaultEmptySpoolWeightG: 215,
};

export async function getWorkspace(workspaceId: string): Promise<Workspace | null> {
  const result = await ddbClient.send(
    new GetCommand({
      TableName: config.tableName,
      Key: { PK: `WORKSPACE#${workspaceId}`, SK: 'METADATA' },
    }),
  );

  if (!result.Item) return null;

  return { ...WORKSPACE_DEFAULTS, ...omitDynamoKeys<Workspace>(result.Item) };
}

export async function updateWorkspace(
  workspaceId: string,
  updates: UpdateWorkspaceInput,
): Promise<Workspace | null> {
  const keys = Object.keys(updates) as (keyof UpdateWorkspaceInput)[];
  if (keys.length === 0) {
    return getWorkspace(workspaceId);
  }

  try {
    const result = await ddbClient.send(
      new UpdateCommand({
        TableName: config.tableName,
        Key: { PK: `WORKSPACE#${workspaceId}`, SK: 'METADATA' },
        UpdateExpression: `SET ${keys.map((_key, i) => `#k${i} = :v${i}`).join(', ')}`,
        ExpressionAttributeNames: Object.fromEntries(keys.map((key, i) => [`#k${i}`, key])),
        ExpressionAttributeValues: Object.fromEntries(keys.map((key, i) => [`:v${i}`, updates[key]])),
        ConditionExpression: 'attribute_exists(PK)',
        ReturnValues: 'ALL_NEW',
      }),
    );

    return { ...WORKSPACE_DEFAULTS, ...omitDynamoKeys<Workspace>(result.Attributes!) };
  } catch (err) {
    if ((err as { name?: string }).name === 'ConditionalCheckFailedException') {
      return null;
    }
    throw err;
  }
}
