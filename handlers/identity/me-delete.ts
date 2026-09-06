import { CognitoIdentityProviderClient, AdminDeleteUserCommand } from '@aws-sdk/client-cognito-identity-provider';
import { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import { Logger } from 'logger';
import { requireEnv } from 'env-config';
import { deleteUserAccount, getDeletionImpact, type WorkspaceResolution } from './lookup.js';

const cognitoClient = new CognitoIdentityProviderClient({});
const userPoolId = requireEnv('USER_POOL_ID');

function validationError(message: string): APIGatewayProxyStructuredResultV2 {
  return { statusCode: 400, body: JSON.stringify({ error: { code: 'VALIDATION_ERROR', message } }) };
}

export async function handler(
  event: APIGatewayProxyEventV2WithJWTAuthorizer,
  logger: Logger,
): Promise<APIGatewayProxyStructuredResultV2> {
  const userId = event.requestContext.authorizer.jwt.claims.sub as string;

  let body: { workspaceResolutions?: Record<string, { action?: unknown; newOwnerId?: unknown }> };
  try {
    body = event.body ? JSON.parse(event.body) : {};
  } catch {
    return validationError('Request body must be valid JSON');
  }

  let impact: Awaited<ReturnType<typeof getDeletionImpact>>;
  try {
    impact = await getDeletionImpact(userId);
  } catch (err) {
    logger.error('Failed to compute deletion impact', { userId, error: (err as Error).message });
    return {
      statusCode: 500,
      body: JSON.stringify({ error: { code: 'INTERNAL_ERROR', message: 'Failed to delete account' } }),
    };
  }

  const resolutions: Record<string, WorkspaceResolution> = {};
  const missing: string[] = [];

  for (const workspace of impact) {
    const raw = body.workspaceResolutions?.[workspace.workspaceId];
    if (!raw || (raw.action !== 'reassign' && raw.action !== 'delete')) {
      missing.push(workspace.workspaceId);
      continue;
    }
    if (raw.action === 'delete') {
      resolutions[workspace.workspaceId] = { action: 'delete' };
      continue;
    }
    const newOwnerId = typeof raw.newOwnerId === 'string' ? raw.newOwnerId : '';
    if (!workspace.members.some((member) => member.userId === newOwnerId)) {
      return validationError(`newOwnerId for workspace ${workspace.workspaceId} must be an existing member`);
    }
    resolutions[workspace.workspaceId] = { action: 'reassign', newOwnerId };
  }

  if (missing.length > 0) {
    return {
      statusCode: 400,
      body: JSON.stringify({
        error: {
          code: 'RESOLUTION_REQUIRED',
          message: 'Choose reassign or delete for every workspace you own with other members',
          workspaceIds: missing,
        },
      }),
    };
  }

  let deleted: boolean;
  try {
    deleted = await deleteUserAccount(userId, resolutions);
  } catch (err) {
    logger.error('Failed to delete account data', { userId, error: (err as Error).message });
    return {
      statusCode: 500,
      body: JSON.stringify({ error: { code: 'INTERNAL_ERROR', message: 'Failed to delete account' } }),
    };
  }

  if (!deleted) {
    return {
      statusCode: 404,
      body: JSON.stringify({ error: { code: 'NOT_FOUND', message: 'User not found' } }),
    };
  }

  try {
    await cognitoClient.send(new AdminDeleteUserCommand({ UserPoolId: userPoolId, Username: userId }));
  } catch (err) {
    // Account data is already gone at this point -- that's the primary
    // guarantee. A stray Cognito user can be cleaned up manually later;
    // the reverse failure order (Cognito gone, DynamoDB cleanup crashes)
    // would leave someone permanently locked out with orphaned data they
    // can never reach again, which is worse.
    logger.error('Account data deleted but Cognito user deletion failed -- manual cleanup needed', {
      userId,
      error: (err as Error).message,
    });
  }

  return { statusCode: 204 };
}
