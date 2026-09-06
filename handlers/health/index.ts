import { randomUUID } from 'crypto';
import { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import { Logger } from 'logger';

export const handler = async (
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyStructuredResultV2> => {
  const correlationId = randomUUID();
  const logger = new Logger(correlationId);

  let result: APIGatewayProxyStructuredResultV2;
  // try/catch here is a template for future handlers with real logic that can throw —
  // nothing in this placeholder body actually throws.
  try {
    logger.info('Health check OK');
    result = { statusCode: 200, body: JSON.stringify({ status: 'ok' }) };
  } catch (err) {
    logger.error('Health check failed', { error: (err as Error).message });
    result = {
      statusCode: 500,
      body: JSON.stringify({ error: { code: 'INTERNAL_ERROR', message: 'Health check failed' } }),
    };
  }

  return { ...result, headers: { ...result.headers, 'X-Correlation-Id': correlationId } };
};
