import { getMember, verifyBearerToken, UnauthorizedError, type FilamentPermissions } from 'workspace-auth';

export type RouteRequirement =
  | { kind: 'member' }
  | { kind: 'ownerOrAdmin' }
  | { kind: 'ownerOnly' }
  | { kind: 'filament'; action: keyof FilamentPermissions }
  | { kind: 'removeMember' };

/**
 * Keyed by the exact HTTP API routeKey ("{METHOD} {path-with-braces}", e.g.
 * "GET /workspaces/{workspaceId}"). Tasks 4, 5, and 6 extend this table as
 * they add each new member-management route -- add the entry in the same
 * commit as the template.yaml route and the handler that serves it.
 */
export const ROUTE_REQUIREMENTS: Record<string, RouteRequirement> = {
  'GET /workspaces/{workspaceId}': { kind: 'member' },
  'PATCH /workspaces/{workspaceId}': { kind: 'ownerOrAdmin' },
  'GET /workspaces/{workspaceId}/spools': { kind: 'filament', action: 'read' },
  'POST /workspaces/{workspaceId}/spools': { kind: 'filament', action: 'create' },
  'GET /workspaces/{workspaceId}/spools/{spoolId}': { kind: 'filament', action: 'read' },
  'PATCH /workspaces/{workspaceId}/spools/{spoolId}': { kind: 'filament', action: 'update' },
  'DELETE /workspaces/{workspaceId}/spools/{spoolId}': { kind: 'filament', action: 'delete' },
  'GET /workspaces/{workspaceId}/spools/{spoolId}/usage': { kind: 'filament', action: 'read' },
  'GET /workspaces/{workspaceId}/members': { kind: 'member' },
  'POST /workspaces/{workspaceId}/members': { kind: 'ownerOrAdmin' },
  'PATCH /workspaces/{workspaceId}/members/{userId}/role': { kind: 'ownerOnly' },
  'PATCH /workspaces/{workspaceId}/members/{userId}/permissions': { kind: 'ownerOrAdmin' },
  'DELETE /workspaces/{workspaceId}/members/{userId}': { kind: 'removeMember' },
};

interface AuthorizerContext {
  userId: string;
  role: string;
}

interface AuthorizerEvent {
  routeKey: string;
  pathParameters?: Record<string, string>;
  headers?: Record<string, string>;
}

type AuthorizerResult = { isAuthorized: true; context: AuthorizerContext } | { isAuthorized: false };

const DENY: AuthorizerResult = { isAuthorized: false };

export const handler = async (event: AuthorizerEvent): Promise<AuthorizerResult> => {
  let userId: string;
  try {
    userId = await verifyBearerToken(event.headers?.authorization ?? event.headers?.Authorization);
  } catch (err) {
    if (err instanceof UnauthorizedError) return DENY;
    throw err;
  }

  const workspaceId = event.pathParameters?.workspaceId;
  if (!workspaceId) return DENY;

  const requirement = ROUTE_REQUIREMENTS[event.routeKey];
  if (!requirement) return DENY;

  const member = await getMember(userId, workspaceId);
  if (!member) return DENY;

  if (requirement.kind === 'member') {
    return { isAuthorized: true, context: { userId, role: member.role } };
  }

  if (requirement.kind === 'ownerOrAdmin') {
    if (member.role !== 'owner' && member.role !== 'admin') return DENY;
    return { isAuthorized: true, context: { userId, role: member.role } };
  }

  if (requirement.kind === 'ownerOnly') {
    if (member.role !== 'owner') return DENY;
    return { isAuthorized: true, context: { userId, role: member.role } };
  }

  if (requirement.kind === 'filament') {
    const hasImplicitAccess = member.role === 'owner' || member.role === 'admin';
    const hasGrantedAccess = member.filamentPermissions?.[requirement.action] === true;
    if (!hasImplicitAccess && !hasGrantedAccess) return DENY;
    return { isAuthorized: true, context: { userId, role: member.role } };
  }

  // requirement.kind === 'removeMember'
  if (member.role !== 'owner' && member.role !== 'admin') return DENY;
  const targetUserId = event.pathParameters?.userId;
  if (!targetUserId) return DENY;
  const target = await getMember(targetUserId, workspaceId);
  if (target?.role === 'owner') return DENY;
  return { isAuthorized: true, context: { userId, role: member.role } };
};
