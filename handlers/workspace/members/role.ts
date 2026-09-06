import { APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import { Logger } from 'logger';
import { getMember } from 'workspace-auth';
import { getPathParam } from 'event-utils';
import { validationError } from 'http-responses';
import type { WorkspaceEvent } from '../index.js';
import { updateMemberRole } from '../members-lookup.js';

const VALID_ROLES = ['admin', 'member'];

export async function handler(event: WorkspaceEvent, logger: Logger): Promise<APIGatewayProxyStructuredResultV2> {
  const workspaceId = getPathParam(event, 'workspaceId');
  const targetUserId = getPathParam(event, 'userId');

  let body: { role?: unknown };
  try {
    body = event.body ? JSON.parse(event.body) : {};
  } catch {
    return validationError('Request body must be valid JSON');
  }

  if (typeof body.role !== 'string' || !VALID_ROLES.includes(body.role)) {
    return validationError("role must be 'admin' or 'member'");
  }
  const role = body.role as 'admin' | 'member';

  try {
    // The route's ownerOnly authorizer requirement only checks the CALLER --
    // nothing else stops an owner from demoting themselves via their own
    // userId in the path, which would orphan the workspace (no member left
    // with role: 'owner' means ownerOnly denies everyone, forever). Guard
    // the TARGET explicitly here.
    const target = await getMember(targetUserId, workspaceId);
    if (target?.role === 'owner') {
      return validationError(
        "Cannot change the workspace owner's role -- use account deletion's ownership transfer instead",
      );
    }

    const member = await updateMemberRole(workspaceId, targetUserId, role);
    if (!member) {
      return { statusCode: 404, body: JSON.stringify({ error: { code: 'NOT_FOUND', message: 'Member not found' } }) };
    }
    return { statusCode: 200, body: JSON.stringify({ member }) };
  } catch (err) {
    logger.error('Failed to update member role', { workspaceId, targetUserId, error: (err as Error).message });
    return { statusCode: 500, body: JSON.stringify({ error: { code: 'INTERNAL_ERROR', message: 'Failed to update role' } }) };
  }
}
