import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  GetCommand,
  type QueryCommandInput,
} from '@aws-sdk/lib-dynamodb';
import { config } from 'env-config';
import { queryAll, omitDynamoKeys } from 'dynamo-utils';
import { colorFamily, type ColorFamily } from './color-family.js';

const ddbClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));

const DIAMETER_TOLERANCE_MM = 0.05;
/** Mirrors the default in handlers/workspace/workspace-lookup.ts. */
const DEFAULT_LOW_STOCK_THRESHOLD_G = 200;

/**
 * The spool fields this handler reads. Declared locally rather than imported
 * from handlers/workspace/ — SAM functions bundle independently, so a
 * cross-handler import would pull that handler's code into this bundle.
 */
export interface SpoolRecord {
  id: string;
  brand: string;
  materialType: string;
  materialName: string;
  colorHex?: string;
  tags?: string[];
  filamentDiameterMm: number;
  remainingWeightG: number;
  netWeightG: number;
  status: string;
  storageLocation?: string;
}

export async function getSpoolById(
  workspaceId: string,
  spoolId: string,
): Promise<SpoolRecord | null> {
  const result = await ddbClient.send(
    new GetCommand({
      TableName: config.tableName,
      Key: { PK: `WORKSPACE#${workspaceId}`, SK: `SPOOL#${spoolId}` },
    }),
  );

  if (!result.Item) return null;
  return omitDynamoKeys<SpoolRecord>(result.Item);
}

async function getLowStockThresholdG(workspaceId: string): Promise<number> {
  const result = await ddbClient.send(
    new GetCommand({
      TableName: config.tableName,
      Key: { PK: `WORKSPACE#${workspaceId}`, SK: 'METADATA' },
    }),
  );

  const threshold = result.Item?.lowStockThresholdG;
  return typeof threshold === 'number' ? threshold : DEFAULT_LOW_STOCK_THRESHOLD_G;
}

export interface SpoolFilters {
  colorFamily?: ColorFamily;
  materialType?: string;
  tag?: string;
  brand?: string;
  nameContains?: string;
  diameterMm?: number;
  storageLocation?: string;
  status?: string;
  lowStockOnly?: boolean;
}

export interface SpoolSummary {
  id: string;
  brand: string;
  materialType: string;
  materialName: string;
  colorHex?: string;
  tags: string[];
  filamentDiameterMm: number;
  remainingWeightG: number;
  netWeightG: number;
  status: string;
  storageLocation?: string;
}

export interface WorkspaceSummary {
  spoolCount: number;
  totalRemainingG: number;
  brandCount: number;
  lowStockCount: number;
  byMaterial: Record<string, number>;
}

function toSummary(spool: SpoolRecord): SpoolSummary {
  return {
    id: spool.id,
    brand: spool.brand,
    materialType: spool.materialType,
    materialName: spool.materialName,
    colorHex: spool.colorHex,
    tags: spool.tags ?? [],
    filamentDiameterMm: spool.filamentDiameterMm,
    remainingWeightG: spool.remainingWeightG,
    netWeightG: spool.netWeightG,
    status: spool.status,
    storageLocation: spool.storageLocation,
  };
}

/**
 * Only materialType, status and tag can push into DynamoDB. The rest need
 * behaviour a FilterExpression cannot express: hue arithmetic, case-insensitive
 * substrings (DynamoDB's contains() is case-sensitive), numeric tolerance, and
 * a threshold that lives on the workspace record rather than the spool.
 */
function buildPushdownFilter(filters: SpoolFilters): Partial<QueryCommandInput> {
  const clauses: string[] = [];
  const names: Record<string, string> = {};
  const values: Record<string, unknown> = {};

  if (filters.materialType) {
    clauses.push('materialType = :materialType');
    values[':materialType'] = filters.materialType;
  }
  if (filters.status) {
    // `status` is a DynamoDB reserved word.
    clauses.push('#status = :status');
    names['#status'] = 'status';
    values[':status'] = filters.status;
  }
  if (filters.tag) {
    clauses.push('contains(tags, :tag)');
    values[':tag'] = filters.tag;
  }

  if (clauses.length === 0) return {};

  return {
    FilterExpression: clauses.join(' AND '),
    ...(Object.keys(names).length > 0 ? { ExpressionAttributeNames: names } : {}),
    ExpressionAttributeValues: values,
  };
}

function includesCI(haystack: string | undefined, needle: string): boolean {
  return (haystack ?? '').toLowerCase().includes(needle.toLowerCase());
}

async function loadSpools(workspaceId: string, filters: SpoolFilters): Promise<SpoolRecord[]> {
  const pushdown = buildPushdownFilter(filters);

  const items = await queryAll(ddbClient, {
    TableName: config.tableName,
    KeyConditionExpression: 'PK = :pk AND begins_with(SK, :skPrefix)',
    ...pushdown,
    ExpressionAttributeValues: {
      ':pk': `WORKSPACE#${workspaceId}`,
      ':skPrefix': 'SPOOL#',
      ...(pushdown.ExpressionAttributeValues ?? {}),
    },
  });

  return items.map((item) => omitDynamoKeys<SpoolRecord>(item));
}

export async function searchSpools(
  workspaceId: string,
  filters: SpoolFilters,
): Promise<SpoolSummary[]> {
  let spools = await loadSpools(workspaceId, filters);

  if (filters.colorFamily) {
    spools = spools.filter((s) => colorFamily(s.colorHex) === filters.colorFamily);
  }
  if (filters.brand) {
    spools = spools.filter((s) => includesCI(s.brand, filters.brand!));
  }
  if (filters.nameContains) {
    spools = spools.filter((s) => includesCI(s.materialName, filters.nameContains!));
  }
  if (filters.storageLocation) {
    spools = spools.filter((s) => includesCI(s.storageLocation, filters.storageLocation!));
  }
  if (filters.diameterMm !== undefined) {
    spools = spools.filter(
      (s) => Math.abs(s.filamentDiameterMm - filters.diameterMm!) <= DIAMETER_TOLERANCE_MM,
    );
  }
  if (filters.lowStockOnly) {
    const threshold = await getLowStockThresholdG(workspaceId);
    spools = spools.filter((s) => s.remainingWeightG < threshold);
  }

  return spools.map(toSummary);
}

export async function getWorkspaceSummary(workspaceId: string): Promise<WorkspaceSummary> {
  const spools = await loadSpools(workspaceId, {});
  const threshold = await getLowStockThresholdG(workspaceId);

  const byMaterial: Record<string, number> = {};
  for (const spool of spools) {
    byMaterial[spool.materialType] = (byMaterial[spool.materialType] ?? 0) + 1;
  }

  return {
    spoolCount: spools.length,
    totalRemainingG: spools.reduce((sum, s) => sum + s.remainingWeightG, 0),
    brandCount: new Set(spools.map((s) => s.brand)).size,
    lowStockCount: spools.filter((s) => s.remainingWeightG < threshold).length,
    byMaterial,
  };
}
