import { APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import { Logger } from 'logger';
import type { WorkspaceEvent } from '../index.js';
import { updateSpool, type Spool } from '../spools-lookup.js';

const NUMBER_UPDATE_KEYS: (keyof Spool)[] = [
  'netWeightG',
  'actualNetWeightG',
  'emptyContainerWeightG',
  'remainingWeightG',
  'filamentDiameterMm',
  'densityGCm3',
  'totalLengthMm',
  'minNozzleTempC',
  'maxNozzleTempC',
  'preheatTempC',
  'minBedTempC',
  'maxBedTempC',
  'minChamberTempC',
  'maxChamberTempC',
  'idealChamberTempC',
  'maxVolumetricFlowMm3s',
  'partCoolingFanPct',
  'dryingTempC',
  'dryingTimeMin',
  'purchasePriceCents',
];

const STRING_UPDATE_KEYS: (keyof Spool)[] = [
  'brand',
  'materialType',
  'materialName',
  'colorHex',
  'purchaseCurrency',
  'purchasedAt',
  'vendor',
  'storageLocation',
  'status',
  'openedAt',
  'brandUuid',
  'materialUuid',
  'packageUuid',
  'instanceUuid',
  'gtin',
  'batchLot',
  'serial',
  'manufacturedAt',
  'countryOfOrigin',
];

const ARRAY_UPDATE_KEYS: (keyof Spool)[] = ['tags'];

const ALLOWED_UPDATE_KEYS: (keyof Spool)[] = [...NUMBER_UPDATE_KEYS, ...STRING_UPDATE_KEYS, ...ARRAY_UPDATE_KEYS];

function validationError(message: string): APIGatewayProxyStructuredResultV2 {
  return { statusCode: 400, body: JSON.stringify({ error: { code: 'VALIDATION_ERROR', message } }) };
}

function notFound(): APIGatewayProxyStructuredResultV2 {
  return {
    statusCode: 404,
    body: JSON.stringify({ error: { code: 'NOT_FOUND', message: 'Spool not found' } }),
  };
}

export async function handler(
  event: WorkspaceEvent,
  logger: Logger,
): Promise<APIGatewayProxyStructuredResultV2> {
  const workspaceId = event.pathParameters?.workspaceId as string;
  const spoolId = event.pathParameters?.spoolId as string;

  let body: Record<string, unknown>;
  try {
    body = event.body ? JSON.parse(event.body) : {};
  } catch {
    return validationError('Request body must be valid JSON');
  }

  const updates: Partial<Spool> = {};
  for (const key of ALLOWED_UPDATE_KEYS) {
    if (!(key in body)) continue;

    if (NUMBER_UPDATE_KEYS.includes(key) && typeof body[key] !== 'number') {
      return validationError(`${key} must be a number`);
    }
    if (STRING_UPDATE_KEYS.includes(key) && typeof body[key] !== 'string') {
      return validationError(`${key} must be a string`);
    }
    if (ARRAY_UPDATE_KEYS.includes(key) && !Array.isArray(body[key])) {
      return validationError(`${key} must be an array`);
    }
    (updates as Record<string, unknown>)[key] = body[key];
  }

  try {
    const spool = await updateSpool(workspaceId, spoolId, updates);
    if (!spool) return notFound();
    return { statusCode: 200, body: JSON.stringify({ spool }) };
  } catch (err) {
    logger.error('Failed to update spool', { workspaceId, spoolId, error: (err as Error).message });
    return {
      statusCode: 500,
      body: JSON.stringify({ error: { code: 'INTERNAL_ERROR', message: 'Failed to update spool' } }),
    };
  }
}
