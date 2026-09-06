import { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import { Logger } from 'logger';
import { getUserId } from 'event-utils';
import { getDeletionImpact } from './lookup.js';

export async function handler(
  event: APIGatewayProxyEventV2WithJWTAuthorizer,
  logger: Logger,
): Promise<APIGatewayProxyStructuredResultV2> {
  const userId = getUserId(event);

  try {
    const workspaces = await getDeletionImpact(userId);
    return { statusCode: 200, body: JSON.stringify({ workspaces }) };
  } catch (err) {
    logger.error('Failed to compute deletion impact', { userId, error: (err as Error).message });
    return {
      statusCode: 500,
      body: JSON.stringify({ error: { code: 'INTERNAL_ERROR', message: 'Failed to compute deletion impact' } }),
    };
  }
}
