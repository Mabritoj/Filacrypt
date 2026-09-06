import { APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import { Logger } from 'logger';
import { getPathParam } from 'event-utils';
import { validationError } from 'http-responses';
import type { FilamentPermissions } from 'workspace-auth';
import type { WorkspaceEvent } from '../index.js';
import { updateMemberPermissions } from '../members-lookup.js';

const VALID_KEYS = ['create', 'read', 'update', 'delete'];

export async function handler(event: WorkspaceEvent, logger: Logger): Promise<APIGatewayProxyStructuredResultV2> {
  const workspaceId = getPathParam(event, 'workspaceId');
  const targetUserId = getPathParam(event, 'userId');

  let body: { filamentPermissions?: Record<string, unknown> };
  try {
    body = event.body ? JSON.parse(event.body) : {};
  } catch {
    return validationError('Request body must be valid JSON');
  }

  const input = body.filamentPermissions;
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    return validationError('filamentPermissions is required and must be an object');
  }

  const updates: Partial<FilamentPermissions> = {};
  for (const [key, value] of Object.entries(input)) {
    if (!VALID_KEYS.includes(key)) {
      return validationError(`Unrecognized permission key: ${key}`);
    }
    if (typeof value !== 'boolean') {
      return validationError(`${key} must be a boolean`);
    }
    (updates as Record<string, boolean>)[key] = value;
  }

  try {
    const member = await updateMemberPermissions(workspaceId, targetUserId, updates);
    if (!member) {
      return { statusCode: 404, body: JSON.stringify({ error: { code: 'NOT_FOUND', message: 'Member not found' } }) };
    }
    return { statusCode: 200, body: JSON.stringify({ member }) };
  } catch (err) {
    logger.error('Failed to update member permissions', { workspaceId, targetUserId, error: (err as Error).message });
    return { statusCode: 500, body: JSON.stringify({ error: { code: 'INTERNAL_ERROR', message: 'Failed to update permissions' } }) };
  }
}
