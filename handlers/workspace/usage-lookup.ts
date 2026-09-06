import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { config } from 'env-config';
import { omitDynamoKeys, queryAll } from 'dynamo-utils';

const ddbClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));

export interface UsageEvent {
  id: string;
  spoolId: string;
  workspaceId: string;
  printJobName: string;
  usedWeightG: number;
  durationMin?: number;
  printerId?: string;
  loggedBy: string;
  occurredAt: string;
}

export async function listUsageEvents(spoolId: string): Promise<UsageEvent[]> {
  const items = await queryAll(ddbClient, {
    TableName: config.tableName,
    KeyConditionExpression: 'PK = :pk AND begins_with(SK, :skPrefix)',
    ExpressionAttributeValues: { ':pk': `SPOOL#${spoolId}`, ':skPrefix': 'EVENT#' },
  });

  return items.map((item) => omitDynamoKeys<UsageEvent>(item));
}
