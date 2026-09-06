import type { APIGatewayProxyEventV2WithJWTAuthorizer } from 'aws-lambda';

interface EventWithPathParameters {
  pathParameters?: Record<string, string | undefined>;
}

/**
 * `event.pathParameters?.[name] as string` was copy-pasted at ~19 call sites
 * across handlers/workspace/** with no validation -- a malformed or future
 * route missing this param would silently flow through as the literal
 * string "undefined" into DynamoDB keys instead of failing loudly.
 */
export function getPathParam(event: EventWithPathParameters, name: string): string {
  const value = event.pathParameters?.[name];
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`Missing required path parameter: ${name}`);
  }
  return value;
}

/**
 * `event.requestContext.authorizer.jwt.claims.sub as string` was
 * copy-pasted across 5 identity handlers with no validation.
 */
export function getUserId(event: APIGatewayProxyEventV2WithJWTAuthorizer): string {
  const sub = event.requestContext.authorizer.jwt.claims.sub;
  if (typeof sub !== 'string' || sub.length === 0) {
    throw new Error('Missing sub claim on authorizer JWT');
  }
  return sub;
}
