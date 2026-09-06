import { randomUUID } from 'crypto';
import { APIGatewayProxyEventV2WithLambdaAuthorizer, APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import { Logger } from 'logger';

export interface WorkspaceAuthorizerContext {
  userId: string;
  role: string;
}

export type WorkspaceEvent = APIGatewayProxyEventV2WithLambdaAuthorizer<WorkspaceAuthorizerContext>;

export const handler = async (event: WorkspaceEvent): Promise<APIGatewayProxyStructuredResultV2> => {
  const correlationId = randomUUID();
  const logger = new Logger(correlationId);
  const path = event.rawPath;

  let result: APIGatewayProxyStructuredResultV2;

  if (path.includes('/spools')) {
    result = await (await import('./spools/index.js')).handler(event, logger);
  } else if (path.includes('/members')) {
    result = await (await import('./members/index.js')).handler(event, logger);
  } else if (path.startsWith('/workspaces/')) {
    result = await (await import('./workspace.js')).handler(event, logger);
  } else {
    logger.warning('No route matched', { path });
    result = {
      statusCode: 404,
      body: JSON.stringify({ error: { code: 'NOT_FOUND', message: 'Not found' } }),
    };
  }

  return { ...result, headers: { ...result.headers, 'X-Correlation-Id': correlationId } };
};
