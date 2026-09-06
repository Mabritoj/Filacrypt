import { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import { Logger } from 'logger';
import { getUserId } from 'event-utils';
import { getUserAndWorkspaces } from './lookup.js';

export async function handler(
  event: APIGatewayProxyEventV2WithJWTAuthorizer,
  logger: Logger
): Promise<APIGatewayProxyStructuredResultV2> {
  const method = event.requestContext.http.method;

  if (method === 'PATCH') {
    return (await import('./me-preferences.js')).handler(event, logger);
  }
  if (method === 'DELETE') {
    return (await import('./me-delete.js')).handler(event, logger);
  }
  if (method !== 'GET') {
    logger.warning('Method not allowed', { method });
    return {
      statusCode: 405,
      body: JSON.stringify({ error: { code: 'METHOD_NOT_ALLOWED', message: 'Method not allowed' } }),
    };
  }

  const userId = getUserId(event);

  try {
    const result = await getUserAndWorkspaces(userId);

    if (!result) {
      logger.warning('User not provisioned yet', { userId });
      return {
        statusCode: 404,
        body: JSON.stringify({ error: { code: 'NOT_FOUND', message: 'User not found' } }),
      };
    }

    return { statusCode: 200, body: JSON.stringify(result) };
  } catch (err) {
    logger.error('Failed to fetch current user', { userId, error: (err as Error).message });
    return {
      statusCode: 500,
      body: JSON.stringify({ error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch current user' } }),
    };
  }
}
