import { APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import { Logger } from 'logger';
import { getPathParam } from 'event-utils';
import { validationError } from 'http-responses';
import type { WorkspaceEvent } from '../index.js';
import { findUserByEmail, addMember, type WorkspaceMember } from '../members-lookup.js';

export async function handler(event: WorkspaceEvent, logger: Logger): Promise<APIGatewayProxyStructuredResultV2> {
  const workspaceId = getPathParam(event, 'workspaceId');

  let body: { email?: unknown };
  try {
    body = event.body ? JSON.parse(event.body) : {};
  } catch {
    return validationError('Request body must be valid JSON');
  }

  const email = typeof body.email === 'string' ? body.email.trim() : '';
  if (!email) return validationError('email is required');

  try {
    const user = await findUserByEmail(email);
    if (!user) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: { code: 'NOT_FOUND', message: 'No Filacrypt user with that email' } }),
      };
    }

    // addMember already knows every field it wrote; combined with the
    // name/email findUserByEmail already returned, that's the full
    // WorkspaceMember -- no listMembers() re-query needed (a fresh member
    // wouldn't reliably show up yet on that eventually-consistent Query).
    const membership = await addMember(workspaceId, user.id);
    const member: WorkspaceMember = {
      userId: user.id,
      name: user.name,
      email: user.email,
      ...membership,
    };
    return { statusCode: 201, body: JSON.stringify({ member }) };
  } catch (err) {
    if ((err as { name?: string }).name === 'ConditionalCheckFailedException') {
      return {
        statusCode: 409,
        body: JSON.stringify({ error: { code: 'ALREADY_MEMBER', message: 'User is already a member of this workspace' } }),
      };
    }
    logger.error('Failed to add workspace member', { workspaceId, email, error: (err as Error).message });
    return { statusCode: 500, body: JSON.stringify({ error: { code: 'INTERNAL_ERROR', message: 'Failed to add member' } }) };
  }
}
