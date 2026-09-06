import { APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import { Logger } from 'logger';
import { getPathParam } from 'event-utils';
import type { WorkspaceEvent } from '../index.js';
import { getSpool } from '../spools-lookup.js';
import { listUsageEvents } from '../usage-lookup.js';

export async function handler(
  event: WorkspaceEvent,
  logger: Logger,
): Promise<APIGatewayProxyStructuredResultV2> {
  const workspaceId = getPathParam(event, 'workspaceId');
  const spoolId = getPathParam(event, 'spoolId');

  try {
    // Confirm the spool actually belongs to this workspace before querying its
    // usage events -- UsageEvent's key isn't nested under the workspace, so
    // skipping this would let a member of a DIFFERENT workspace read this
    // spool's usage just by knowing its id.
    const spool = await getSpool(workspaceId, spoolId);
    if (!spool) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: { code: 'NOT_FOUND', message: 'Spool not found' } }),
      };
    }

    const usageEvents = await listUsageEvents(spoolId);
    return { statusCode: 200, body: JSON.stringify({ usageEvents }) };
  } catch (err) {
    logger.error('Failed to list usage events', { workspaceId, spoolId, error: (err as Error).message });
    return {
      statusCode: 500,
      body: JSON.stringify({ error: { code: 'INTERNAL_ERROR', message: 'Failed to list usage events' } }),
    };
  }
}
