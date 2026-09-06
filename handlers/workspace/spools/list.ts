import { APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import { Logger } from 'logger';
import { getPathParam } from 'event-utils';
import type { WorkspaceEvent } from '../index.js';
import { listSpools } from '../spools-lookup.js';

export async function handler(
  event: WorkspaceEvent,
  logger: Logger,
): Promise<APIGatewayProxyStructuredResultV2> {
  const workspaceId = getPathParam(event, 'workspaceId');

  try {
    const spools = await listSpools(workspaceId);
    return { statusCode: 200, body: JSON.stringify({ spools }) };
  } catch (err) {
    logger.error('Failed to list spools', { workspaceId, error: (err as Error).message });
    return {
      statusCode: 500,
      body: JSON.stringify({ error: { code: 'INTERNAL_ERROR', message: 'Failed to list spools' } }),
    };
  }
}
