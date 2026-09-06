import { APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import { Logger } from 'logger';
import { getPathParam } from 'event-utils';
import type { WorkspaceEvent } from '../index.js';
import { removeMember } from '../members-lookup.js';

export async function handler(event: WorkspaceEvent, logger: Logger): Promise<APIGatewayProxyStructuredResultV2> {
  const workspaceId = getPathParam(event, 'workspaceId');
  const targetUserId = getPathParam(event, 'userId');

  try {
    const removed = await removeMember(workspaceId, targetUserId);
    if (!removed) {
      return { statusCode: 404, body: JSON.stringify({ error: { code: 'NOT_FOUND', message: 'Member not found' } }) };
    }
    return { statusCode: 204 };
  } catch (err) {
    logger.error('Failed to remove member', { workspaceId, targetUserId, error: (err as Error).message });
    return { statusCode: 500, body: JSON.stringify({ error: { code: 'INTERNAL_ERROR', message: 'Failed to remove member' } }) };
  }
}
