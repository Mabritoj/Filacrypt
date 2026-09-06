import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb';
import { CognitoJwtVerifier } from 'aws-jwt-verify';
import { config, requireEnv } from 'env-config';

const ddbClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));

export class ForbiddenError extends Error {
  constructor(message = 'Not a member of this workspace') {
    super(message);
    this.name = 'ForbiddenError';
  }
}

export class UnauthorizedError extends Error {
  constructor(message = 'Unauthorized') {
    super(message);
    this.name = 'UnauthorizedError';
  }
}

export type Role = 'owner' | 'admin' | 'member';

export interface FilamentPermissions {
  create: boolean;
  read: boolean;
  update: boolean;
  delete: boolean;
}

export interface Member {
  role: Role;
  filamentPermissions?: FilamentPermissions;
}

export async function getMember(userId: string, workspaceId: string): Promise<Member | null> {
  const result = await ddbClient.send(
    new GetCommand({
      TableName: config.tableName,
      Key: { PK: `WORKSPACE#${workspaceId}`, SK: `MEMBER#${userId}` },
    }),
  );

  if (!result.Item) return null;
  return { role: result.Item.role as Role, filamentPermissions: result.Item.filamentPermissions };
}

export async function assertWorkspaceMember(userId: string, workspaceId: string): Promise<Member> {
  const member = await getMember(userId, workspaceId);
  if (!member) throw new ForbiddenError();
  return member;
}

/**
 * Owner and admin bypass filamentPermissions entirely -- their filament
 * access is implicit-full, per the design spec's Roles section. Only a
 * `member`-role caller is actually checked against the granted permission.
 */
export async function assertFilamentPermission(
  userId: string,
  workspaceId: string,
  action: keyof FilamentPermissions,
): Promise<Member> {
  const member = await assertWorkspaceMember(userId, workspaceId);
  if (member.role === 'owner' || member.role === 'admin') return member;
  if (!member.filamentPermissions?.[action]) {
    throw new ForbiddenError(`Missing filament:${action} permission in this workspace`);
  }
  return member;
}

/**
 * tokenUse: 'id' matters. The frontend signs requests with the Cognito ID
 * token, and accepting an access token here would let a token minted for a
 * different purpose stand in for proof of identity.
 *
 * Lazily constructed (memoized on first call), not at module load: an eager
 * requireEnv() at module scope would make every function that imports this
 * module -- including ones with no Cognito env vars set, like
 * WorkspaceFunction -- fail at cold start unless it also had
 * COGNITO_USER_POOL_ID/COGNITO_CLIENT_ID configured. Only the two callers
 * that actually invoke verifyBearerToken (PermissionAuthorizerFunction,
 * ChatFunction) need those set, and only paid for it when it's actually
 * called.
 */
let verifier: ReturnType<typeof CognitoJwtVerifier.create> | undefined;

function getVerifier() {
  if (!verifier) {
    verifier = CognitoJwtVerifier.create({
      userPoolId: requireEnv('COGNITO_USER_POOL_ID'),
      tokenUse: 'id',
      clientId: requireEnv('COGNITO_CLIENT_ID'),
    });
  }
  return verifier;
}

export async function verifyBearerToken(authHeader: string | undefined): Promise<string> {
  if (!authHeader?.startsWith('Bearer ')) {
    throw new UnauthorizedError('Missing bearer token');
  }

  const token = authHeader.slice('Bearer '.length);

  let payload: { sub?: string };
  try {
    payload = await getVerifier().verify(token);
  } catch {
    throw new UnauthorizedError('Invalid token');
  }

  if (!payload.sub) {
    throw new UnauthorizedError('Token has no subject');
  }

  return payload.sub;
}
