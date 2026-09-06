import { APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import { Logger } from 'logger';
import type { WorkspaceEvent } from '../index.js';
import { createSpool, type NewSpool } from '../spools-lookup.js';

const REQUIRED_STRING_FIELDS = ['brand', 'materialType', 'materialName', 'status'] as const;
const REQUIRED_NUMBER_FIELDS = ['netWeightG', 'remainingWeightG', 'filamentDiameterMm'] as const;

function validationError(message: string): APIGatewayProxyStructuredResultV2 {
  return { statusCode: 400, body: JSON.stringify({ error: { code: 'VALIDATION_ERROR', message } }) };
}

export async function handler(
  event: WorkspaceEvent,
  logger: Logger,
): Promise<APIGatewayProxyStructuredResultV2> {
  const workspaceId = event.pathParameters?.workspaceId as string;
  const userId = event.requestContext.authorizer.lambda.userId;

  let body: Record<string, unknown>;
  try {
    body = event.body ? JSON.parse(event.body) : {};
  } catch {
    return validationError('Request body must be valid JSON');
  }

  for (const field of REQUIRED_STRING_FIELDS) {
    if (typeof body[field] !== 'string' || !body[field]) {
      return validationError(`${field} is required`);
    }
  }
  for (const field of REQUIRED_NUMBER_FIELDS) {
    if (typeof body[field] !== 'number') {
      return validationError(`${field} is required and must be a number`);
    }
  }
  if (!Array.isArray(body.tags)) {
    return validationError('tags is required and must be an array');
  }

  // workspaceId and addedBy are server-derived -- never trust the body for these,
  // even though both are part of the NewSpool type.
  const { workspaceId: _ignoredWorkspaceId, addedBy: _ignoredAddedBy, ...rest } = body;

  try {
    const spool = await createSpool(workspaceId, userId, rest as Omit<NewSpool, 'workspaceId' | 'addedBy'>);
    return { statusCode: 201, body: JSON.stringify({ spool }) };
  } catch (err) {
    logger.error('Failed to create spool', { workspaceId, userId, error: (err as Error).message });
    return {
      statusCode: 500,
      body: JSON.stringify({ error: { code: 'INTERNAL_ERROR', message: 'Failed to create spool' } }),
    };
  }
}
