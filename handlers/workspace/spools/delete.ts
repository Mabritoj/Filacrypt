import { APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import { Logger } from 'logger';
import type { WorkspaceEvent } from '../index.js';
import { deleteSpool } from '../spools-lookup.js';

export async function handler(
  event: WorkspaceEvent,
  logger: Logger,
): Promise<APIGatewayProxyStructuredResultV2> {
  const workspaceId = event.pathParameters?.workspaceId as string;
  const spoolId = event.pathParameters?.spoolId as string;

  try {
    const deleted = await deleteSpool(workspaceId, spoolId);
    if (!deleted) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: { code: 'NOT_FOUND', message: 'Spool not found' } }),
      };
    }
    return { statusCode: 204 };
  } catch (err) {
    logger.error('Failed to delete spool', { workspaceId, spoolId, error: (err as Error).message });
    return {
      statusCode: 500,
      body: JSON.stringify({ error: { code: 'INTERNAL_ERROR', message: 'Failed to delete spool' } }),
    };
  }
}
