import { randomUUID } from 'crypto';
import { DynamoDBClient, GetItemCommand, TransactWriteItemsCommand, UpdateItemCommand } from '@aws-sdk/client-dynamodb';
import { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import { Logger } from 'logger';
import { config } from 'env-config';
import { getUserAndWorkspaces } from '../lookup.js';

const ddbClient = new DynamoDBClient({});

const DEFAULT_PREFERENCES = {
  weightUnit: 'g',
  temperatureUnit: 'C',
  lengthUnit: 'm',
  currency: 'USD',
  theme: 'dark',
  defaultEntryMode: 'nfc',
};

function validationError(message: string): APIGatewayProxyStructuredResultV2 {
  return {
    statusCode: 400,
    body: JSON.stringify({ error: { code: 'VALIDATION_ERROR', message } }),
  };
}

function usernameTaken(): APIGatewayProxyStructuredResultV2 {
  return {
    statusCode: 409,
    body: JSON.stringify({ error: { code: 'USERNAME_TAKEN', message: 'Username is already taken' } }),
  };
}

/**
 * GSI2 (the email index findUserByEmail relies on) is only written by the
 * TransactWriteItems below, which the already-provisioned early-return path
 * skips entirely. Any user provisioned before this feature deployed -- i.e.
 * every real pre-existing account -- has no GSI2PK/GSI2SK and can never be
 * found by invite-by-email. This endpoint is hit on every app load, so
 * self-healing it here (instead of a separate migration script) reaches
 * every such user the first time they open the app post-deploy.
 */
async function backfillEmailIndex(userId: string, email: string, logger: Logger): Promise<void> {
  const expectedGsi2Pk = `EMAIL#${email.toLowerCase()}`;

  const profileResult = await ddbClient.send(new GetItemCommand({
    TableName: config.tableName,
    Key: { PK: { S: `USER#${userId}` }, SK: { S: 'PROFILE' } },
  }));

  const item = profileResult.Item;
  if (item?.GSI2PK?.S === expectedGsi2Pk && item?.GSI2SK?.S === 'PROFILE') {
    return;
  }

  logger.info('Backfilling missing/stale GSI2 email index for existing user', { userId });
  await ddbClient.send(new UpdateItemCommand({
    TableName: config.tableName,
    Key: { PK: { S: `USER#${userId}` }, SK: { S: 'PROFILE' } },
    UpdateExpression: 'SET GSI2PK = :gsi2pk, GSI2SK = :gsi2sk',
    ExpressionAttributeValues: {
      ':gsi2pk': { S: expectedGsi2Pk },
      ':gsi2sk': { S: 'PROFILE' },
    },
    ConditionExpression: 'attribute_exists(PK)',
  }));
}

export async function handler(
  event: APIGatewayProxyEventV2WithJWTAuthorizer,
  logger: Logger
): Promise<APIGatewayProxyStructuredResultV2> {
  const userId = event.requestContext.authorizer.jwt.claims.sub as string;
  const email = event.requestContext.authorizer.jwt.claims.email as string;
  const emailVerified = event.requestContext.authorizer.jwt.claims.email_verified === 'true';

  try {
    const existing = await getUserAndWorkspaces(userId);
    if (existing) {
      logger.info('User already set up, returning existing data', { userId });
      await backfillEmailIndex(userId, email, logger);
      return { statusCode: 200, body: JSON.stringify(existing) };
    }

    let body: { name?: unknown; username?: unknown };
    try {
      body = event.body ? JSON.parse(event.body) : {};
    } catch {
      return validationError('Request body must be valid JSON');
    }

    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const username = typeof body.username === 'string' ? body.username.trim() : '';

    if (!name) return validationError('name is required');
    if (!username) return validationError('username is required');

    const usernameKey = username.toLowerCase();

    const reservationCheck = await ddbClient.send(new GetItemCommand({
      TableName: config.tableName,
      Key: { PK: { S: `USERNAME#${usernameKey}` }, SK: { S: 'RESERVATION' } },
    }));

    if (reservationCheck.Item) {
      logger.info('Username already taken', { userId, username });
      return usernameTaken();
    }

    const workspaceId = randomUUID();
    const now = new Date().toISOString();

    try {
      await ddbClient.send(new TransactWriteItemsCommand({
        TransactItems: [
          {
            Put: {
              TableName: config.tableName,
              Item: {
                PK: { S: `USER#${userId}` },
                SK: { S: 'PROFILE' },
                type: { S: 'USER' },
                id: { S: userId },
                name: { S: name },
                username: { S: username },
                email: { S: email },
                emailVerified: { BOOL: emailVerified },
                GSI2PK: { S: `EMAIL#${email.toLowerCase()}` },
                GSI2SK: { S: 'PROFILE' },
                preferences: {
                  M: {
                    weightUnit: { S: DEFAULT_PREFERENCES.weightUnit },
                    temperatureUnit: { S: DEFAULT_PREFERENCES.temperatureUnit },
                    lengthUnit: { S: DEFAULT_PREFERENCES.lengthUnit },
                    currency: { S: DEFAULT_PREFERENCES.currency },
                    theme: { S: DEFAULT_PREFERENCES.theme },
                    defaultEntryMode: { S: DEFAULT_PREFERENCES.defaultEntryMode },
                  },
                },
                createdAt: { S: now },
              },
              ConditionExpression: 'attribute_not_exists(PK)',
            },
          },
          {
            Put: {
              TableName: config.tableName,
              Item: {
                PK: { S: `WORKSPACE#${workspaceId}` },
                SK: { S: 'METADATA' },
                type: { S: 'WORKSPACE' },
                id: { S: workspaceId },
                name: { S: `${name}'s Workspace` },
                ownerId: { S: userId },
                lowStockThresholdG: { N: '200' },
                defaultDiameterMm: { N: '1.75' },
                defaultEmptySpoolWeightG: { N: '215' },
                createdAt: { S: now },
              },
            },
          },
          {
            Put: {
              TableName: config.tableName,
              Item: {
                PK: { S: `WORKSPACE#${workspaceId}` },
                SK: { S: `MEMBER#${userId}` },
                type: { S: 'MEMBERSHIP' },
                GSI1PK: { S: `USER#${userId}` },
                GSI1SK: { S: `WORKSPACE#${workspaceId}` },
                role: { S: 'owner' },
                joinedAt: { S: now },
              },
            },
          },
          {
            Put: {
              TableName: config.tableName,
              Item: {
                PK: { S: `USERNAME#${usernameKey}` },
                SK: { S: 'RESERVATION' },
                type: { S: 'USERNAME_RESERVATION' },
                userId: { S: userId },
              },
              ConditionExpression: 'attribute_not_exists(PK)',
            },
          },
        ],
      }));
    } catch (err) {
      const cancellationReasons = (err as { CancellationReasons?: { Code?: string }[] }).CancellationReasons;

      if (cancellationReasons?.[0]?.Code === 'ConditionalCheckFailed') {
        logger.info('User already provisioned (concurrent request), returning existing data', { userId });
        const winner = await getUserAndWorkspaces(userId);
        return { statusCode: 200, body: JSON.stringify(winner) };
      }

      if (cancellationReasons?.[3]?.Code === 'ConditionalCheckFailed') {
        logger.info('Username taken (concurrent request)', { userId, username });
        return usernameTaken();
      }

      throw err;
    }

    logger.info('Provisioned new user', { userId, workspaceId });
    const created = await getUserAndWorkspaces(userId);
    return { statusCode: 201, body: JSON.stringify(created) };
  } catch (err) {
    logger.error('Failed to set up user', { userId, error: (err as Error).message });
    return {
      statusCode: 500,
      body: JSON.stringify({ error: { code: 'INTERNAL_ERROR', message: 'Failed to set up user' } }),
    };
  }
}
