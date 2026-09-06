import { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import { Logger } from 'logger';

export async function handler(
  event: APIGatewayProxyEventV2WithJWTAuthorizer,
  logger: Logger
): Promise<APIGatewayProxyStructuredResultV2> {
  const { method } = event.requestContext.http;
  const path = event.rawPath;

  if (path === '/user/setup' && method === 'POST') {
    return (await import('./setup.js')).handler(event, logger);
  }

  logger.warning('Method not allowed', { method, path });
  return {
    statusCode: 405,
    body: JSON.stringify({ error: { code: 'METHOD_NOT_ALLOWED', message: 'Method not allowed' } }),
  };
}
