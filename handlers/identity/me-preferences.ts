import { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import { Logger } from 'logger';
import { updateUserPreferences, type UserProfile } from './lookup.js';

type Preferences = UserProfile['preferences'];

const ALLOWED_VALUES: { [K in keyof Preferences]?: readonly string[] } = {
  weightUnit: ['g', 'kg'],
  temperatureUnit: ['C', 'F'],
  lengthUnit: ['m', 'ft'],
  theme: ['dark', 'light'],
  defaultEntryMode: ['nfc', 'manual'],
};

const ALLOWED_KEYS = ['weightUnit', 'temperatureUnit', 'lengthUnit', 'currency', 'theme', 'defaultEntryMode'] as const;

function validationError(message: string): APIGatewayProxyStructuredResultV2 {
  return { statusCode: 400, body: JSON.stringify({ error: { code: 'VALIDATION_ERROR', message } }) };
}

function notFound(): APIGatewayProxyStructuredResultV2 {
  return {
    statusCode: 404,
    body: JSON.stringify({ error: { code: 'NOT_FOUND', message: 'User not found' } }),
  };
}

export async function handler(
  event: APIGatewayProxyEventV2WithJWTAuthorizer,
  logger: Logger,
): Promise<APIGatewayProxyStructuredResultV2> {
  const userId = event.requestContext.authorizer.jwt.claims.sub as string;

  let body: { preferences?: Record<string, unknown> };
  try {
    body = event.body ? JSON.parse(event.body) : {};
  } catch {
    return validationError('Request body must be valid JSON');
  }

  const preferences = body.preferences ?? {};
  const updates: Partial<Preferences> = {};
  for (const key of ALLOWED_KEYS) {
    if (!(key in preferences)) continue;
    const value = preferences[key];

    if (typeof value !== 'string') {
      return validationError(`${key} must be a string`);
    }
    const allowedValues = ALLOWED_VALUES[key];
    if (allowedValues && !allowedValues.includes(value)) {
      return validationError(`${key} must be one of: ${allowedValues.join(', ')}`);
    }
    (updates as Record<string, unknown>)[key] = value;
  }

  try {
    const user = await updateUserPreferences(userId, updates);
    if (!user) return notFound();
    return { statusCode: 200, body: JSON.stringify({ user }) };
  } catch (err) {
    logger.error('Failed to update user preferences', { userId, error: (err as Error).message });
    return {
      statusCode: 500,
      body: JSON.stringify({ error: { code: 'INTERNAL_ERROR', message: 'Failed to update user preferences' } }),
    };
  }
}
