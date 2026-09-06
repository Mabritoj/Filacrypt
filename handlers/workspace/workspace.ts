import { APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import { Logger } from 'logger';
import { getMember } from 'workspace-auth';
import type { WorkspaceEvent } from './index.js';
import { getWorkspace, updateWorkspace, type UpdateWorkspaceInput } from './workspace-lookup.js';

const ALLOWED_UPDATE_KEYS: (keyof UpdateWorkspaceInput)[] = [
  'lowStockThresholdG',
  'defaultDiameterMm',
  'defaultEmptySpoolWeightG',
  'defaultPrinterId',
];

const NUMBER_UPDATE_KEYS: (keyof UpdateWorkspaceInput)[] = [
  'lowStockThresholdG',
  'defaultDiameterMm',
  'defaultEmptySpoolWeightG',
];

const STRING_UPDATE_KEYS: (keyof UpdateWorkspaceInput)[] = ['defaultPrinterId'];

function notFound(): APIGatewayProxyStructuredResultV2 {
  return {
    statusCode: 404,
    body: JSON.stringify({ error: { code: 'NOT_FOUND', message: 'Workspace not found' } }),
  };
}

export async function handler(
  event: WorkspaceEvent,
  logger: Logger,
): Promise<APIGatewayProxyStructuredResultV2> {
  const userId = event.requestContext.authorizer.lambda.userId;
  const role = event.requestContext.authorizer.lambda.role;
  const workspaceId = event.pathParameters?.workspaceId as string;
  const method = event.requestContext.http.method;

  try {
    if (method === 'GET') {
      const workspace = await getWorkspace(workspaceId);
      if (!workspace) return notFound();
      const member = await getMember(userId, workspaceId);
      return {
        statusCode: 200,
        body: JSON.stringify({
          workspace: {
            ...workspace,
            callerRole: role,
            callerFilamentPermissions: member?.filamentPermissions,
          },
        }),
      };
    }

    if (method === 'PATCH') {
      let body: Record<string, unknown>;
      try {
        body = event.body ? JSON.parse(event.body) : {};
      } catch {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: { code: 'VALIDATION_ERROR', message: 'Request body must be valid JSON' } }),
        };
      }

      const updates: UpdateWorkspaceInput = {};
      for (const key of ALLOWED_UPDATE_KEYS) {
        if (key in body) {
          if (NUMBER_UPDATE_KEYS.includes(key) && typeof body[key] !== 'number') {
            return {
              statusCode: 400,
              body: JSON.stringify({ error: { code: 'VALIDATION_ERROR', message: `${key} must be a number` } }),
            };
          }
          if (STRING_UPDATE_KEYS.includes(key) && typeof body[key] !== 'string') {
            return {
              statusCode: 400,
              body: JSON.stringify({ error: { code: 'VALIDATION_ERROR', message: `${key} must be a string` } }),
            };
          }
          (updates as Record<string, unknown>)[key] = body[key];
        }
      }

      const workspace = await updateWorkspace(workspaceId, updates);
      if (!workspace) return notFound();
      const member = await getMember(userId, workspaceId);
      return {
        statusCode: 200,
        body: JSON.stringify({
          workspace: {
            ...workspace,
            callerRole: role,
            callerFilamentPermissions: member?.filamentPermissions,
          },
        }),
      };
    }

    logger.warning('Method not allowed', { method });
    return {
      statusCode: 405,
      body: JSON.stringify({ error: { code: 'METHOD_NOT_ALLOWED', message: 'Method not allowed' } }),
    };
  } catch (err) {
    logger.error('Failed to handle workspace request', {
      userId,
      workspaceId,
      error: (err as Error).message,
    });
    return {
      statusCode: 500,
      body: JSON.stringify({ error: { code: 'INTERNAL_ERROR', message: 'Failed to handle workspace request' } }),
    };
  }
}
