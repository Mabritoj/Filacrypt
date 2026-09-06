import { APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import { Logger } from 'logger';
import type { WorkspaceEvent } from '../index.js';

export async function handler(event: WorkspaceEvent, logger: Logger): Promise<APIGatewayProxyStructuredResultV2> {
  const { method } = event.requestContext.http;
  const path = event.rawPath;

  if (path.endsWith('/members') && method === 'GET') {
    return (await import('./list.js')).handler(event, logger);
  }
  if (path.endsWith('/members') && method === 'POST') {
    return (await import('./invite.js')).handler(event, logger);
  }
  if (path.endsWith('/role') && method === 'PATCH') {
    return (await import('./role.js')).handler(event, logger);
  }
  if (path.endsWith('/permissions') && method === 'PATCH') {
    return (await import('./permissions.js')).handler(event, logger);
  }
  if (!path.endsWith('/role') && !path.endsWith('/permissions') && !path.endsWith('/members') && method === 'DELETE') {
    return (await import('./remove.js')).handler(event, logger);
  }

  logger.warning('Method not allowed', { method, path });
  return { statusCode: 405, body: JSON.stringify({ error: { code: 'METHOD_NOT_ALLOWED', message: 'Method not allowed' } }) };
}
