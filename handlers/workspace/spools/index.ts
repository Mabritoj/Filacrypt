import { APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import { Logger } from 'logger';
import type { WorkspaceEvent } from '../index.js';

export async function handler(
  event: WorkspaceEvent,
  logger: Logger,
): Promise<APIGatewayProxyStructuredResultV2> {
  const { method } = event.requestContext.http;
  const spoolId = event.pathParameters?.spoolId;
  const path = event.rawPath;

  if (!spoolId && method === 'GET') {
    return (await import('./list.js')).handler(event, logger);
  }
  if (!spoolId && method === 'POST') {
    return (await import('./create.js')).handler(event, logger);
  }
  if (spoolId && path.endsWith('/usage') && method === 'GET') {
    return (await import('./usage.js')).handler(event, logger);
  }
  if (spoolId && method === 'GET') {
    return (await import('./get.js')).handler(event, logger);
  }
  if (spoolId && method === 'PATCH') {
    return (await import('./update.js')).handler(event, logger);
  }
  if (spoolId && method === 'DELETE') {
    return (await import('./delete.js')).handler(event, logger);
  }

  logger.warning('Method not allowed', { method, path });
  return {
    statusCode: 405,
    body: JSON.stringify({ error: { code: 'METHOD_NOT_ALLOWED', message: 'Method not allowed' } }),
  };
}
