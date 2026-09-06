import { randomUUID } from 'crypto';
import { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import { Logger } from 'logger';

export const handler = async (
  event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyStructuredResultV2> => {
  const correlationId = randomUUID();
  const logger = new Logger(correlationId);
  const path = event.rawPath;

  let result: APIGatewayProxyStructuredResultV2;
  if (path === '/me/deletion-impact') {
    result = await (await import('./me-deletion-impact.js')).handler(event, logger);
  } else if (path === '/me') {
    result = await (await import('./me.js')).handler(event, logger);
  } else if (path.startsWith('/user')) {
    result = await (await import('./user/index.js')).handler(event, logger);
  } else {
    logger.warning('No route matched', { path });
    result = { statusCode: 404, body: JSON.stringify({ error: { code: 'NOT_FOUND', message: 'Not found' } }) };
  }

  return { ...result, headers: { ...result.headers, 'X-Correlation-Id': correlationId } };
};
