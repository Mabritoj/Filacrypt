import { APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import { Logger } from 'logger';
import { getPathParam } from 'event-utils';
import type { WorkspaceEvent } from '../index.js';
import { listMembers } from '../members-lookup.js';

export async function handler(event: WorkspaceEvent, logger: Logger): Promise<APIGatewayProxyStructuredResultV2> {
  const workspaceId = getPathParam(event, 'workspaceId');

  try {
    const members = await listMembers(workspaceId);
    return { statusCode: 200, body: JSON.stringify({ members }) };
  } catch (err) {
    logger.error('Failed to list workspace members', { workspaceId, error: (err as Error).message });
    return { statusCode: 500, body: JSON.stringify({ error: { code: 'INTERNAL_ERROR', message: 'Failed to list members' } }) };
  }
}
