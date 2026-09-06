import { randomUUID } from 'crypto';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  DeleteCommand,
  GetCommand,
  PutCommand,
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb';
import { config } from 'env-config';
import { omitDynamoKeys, queryAll } from 'dynamo-utils';

const ddbClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));

// Matches website/src/api/types/spool.ts's Spool interface exactly.
export interface Spool {
  id: string;
  workspaceId: string;
  brand: string;
  materialType: string;
  materialName: string;
  tags: string[];
  certifications?: string[];
  colorHex?: string;
  netWeightG: number;
  actualNetWeightG?: number;
  emptyContainerWeightG?: number;
  remainingWeightG: number;
  filamentDiameterMm: number;
  densityGCm3?: number;
  totalLengthMm?: number;
  minNozzleTempC?: number;
  maxNozzleTempC?: number;
  preheatTempC?: number;
  minBedTempC?: number;
  maxBedTempC?: number;
  minChamberTempC?: number;
  maxChamberTempC?: number;
  idealChamberTempC?: number;
  maxVolumetricFlowMm3s?: number;
  partCoolingFanPct?: number;
  dryingTempC?: number;
  dryingTimeMin?: number;
  purchasePriceCents?: number;
  purchaseCurrency?: string;
  purchasedAt?: string;
  vendor?: string;
  storageLocation?: string;
  status: 'in_use' | 'stored' | 'empty' | 'archived';
  loadedInPrinterId?: string;
  openedAt?: string;
  brandUuid?: string;
  materialUuid?: string;
  packageUuid?: string;
  instanceUuid?: string;
  gtin?: string;
  batchLot?: string;
  serial?: string;
  manufacturedAt?: string;
  countryOfOrigin?: string;
  tag?: {
    uid: string;
    standard: string;
    writeProtection: string;
    healthy: boolean;
    lastScannedAt?: string;
    lastWrittenAt?: string;
    memoryUsedBytes?: number;
    memoryTotalBytes?: number;
  };
  addedBy: string;
  createdAt: string;
  updatedAt: string;
}

export type NewSpool = Omit<Spool, 'id' | 'createdAt' | 'updatedAt'>;

export async function listSpools(workspaceId: string): Promise<Spool[]> {
  const items = await queryAll(ddbClient, {
    TableName: config.tableName,
    KeyConditionExpression: 'PK = :pk AND begins_with(SK, :skPrefix)',
    ExpressionAttributeValues: { ':pk': `WORKSPACE#${workspaceId}`, ':skPrefix': 'SPOOL#' },
  });

  return items.map((item) => omitDynamoKeys<Spool>(item));
}

export async function getSpool(workspaceId: string, spoolId: string): Promise<Spool | null> {
  const result = await ddbClient.send(
    new GetCommand({
      TableName: config.tableName,
      Key: { PK: `WORKSPACE#${workspaceId}`, SK: `SPOOL#${spoolId}` },
    }),
  );

  if (!result.Item) return null;
  return omitDynamoKeys<Spool>(result.Item);
}

export async function createSpool(
  workspaceId: string,
  addedBy: string,
  input: Omit<NewSpool, 'workspaceId' | 'addedBy'>,
): Promise<Spool> {
  const id = randomUUID();
  const now = new Date().toISOString();

  const spool: Spool = { ...input, id, workspaceId, addedBy, createdAt: now, updatedAt: now };

  await ddbClient.send(
    new PutCommand({
      TableName: config.tableName,
      Item: { PK: `WORKSPACE#${workspaceId}`, SK: `SPOOL#${id}`, type: 'SPOOL', ...spool },
      ConditionExpression: 'attribute_not_exists(PK)',
    }),
  );

  return spool;
}

export async function updateSpool(
  workspaceId: string,
  spoolId: string,
  updates: Partial<Spool>,
): Promise<Spool | null> {
  const keys = Object.keys(updates) as (keyof Spool)[];
  if (keys.length === 0) {
    return getSpool(workspaceId, spoolId);
  }

  try {
    const result = await ddbClient.send(
      new UpdateCommand({
        TableName: config.tableName,
        Key: { PK: `WORKSPACE#${workspaceId}`, SK: `SPOOL#${spoolId}` },
        UpdateExpression: `SET ${keys.map((_key, i) => `#k${i} = :v${i}`).join(', ')}`,
        ExpressionAttributeNames: Object.fromEntries(keys.map((key, i) => [`#k${i}`, key])),
        ExpressionAttributeValues: Object.fromEntries(keys.map((key, i) => [`:v${i}`, updates[key]])),
        ConditionExpression: 'attribute_exists(PK)',
        ReturnValues: 'ALL_NEW',
      }),
    );

    return omitDynamoKeys<Spool>(result.Attributes!);
  } catch (err) {
    if ((err as { name?: string }).name === 'ConditionalCheckFailedException') {
      return null;
    }
    throw err;
  }
}

export async function deleteSpool(workspaceId: string, spoolId: string): Promise<boolean> {
  try {
    await ddbClient.send(
      new DeleteCommand({
        TableName: config.tableName,
        Key: { PK: `WORKSPACE#${workspaceId}`, SK: `SPOOL#${spoolId}` },
        ConditionExpression: 'attribute_exists(PK)',
      }),
    );
    return true;
  } catch (err) {
    if ((err as { name?: string }).name === 'ConditionalCheckFailedException') {
      return false;
    }
    throw err;
  }
}
