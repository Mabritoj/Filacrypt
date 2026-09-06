import { mockClient } from 'aws-sdk-client-mock';
import { DynamoDBDocumentClient, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { config } from 'env-config';
import { listUsageEvents } from './usage-lookup.js';

const ddbMock = mockClient(DynamoDBDocumentClient);

beforeEach(() => ddbMock.reset());

test('queries by spool PK and EVENT# prefix, strips internal keys', async () => {
  ddbMock.on(QueryCommand).resolves({
    Items: [
      {
        PK: 'SPOOL#spool-1', SK: 'EVENT#2026-01-01T00:00:00.000Z#usage-1', type: 'USAGE_EVENT',
        id: 'usage-1', spoolId: 'spool-1', workspaceId: 'ws-1', printJobName: 'Benchy',
        usedWeightG: 42, loggedBy: 'user-1', occurredAt: '2026-01-01T00:00:00.000Z',
      },
    ],
  });

  const result = await listUsageEvents('spool-1');

  expect(result).toHaveLength(1);
  expect(result[0]).not.toHaveProperty('PK');
  expect(result[0].id).toBe('usage-1');
  const call = ddbMock.commandCalls(QueryCommand)[0];
  expect(call.args[0].input).toMatchObject({
    TableName: config.tableName,
    KeyConditionExpression: 'PK = :pk AND begins_with(SK, :skPrefix)',
    ExpressionAttributeValues: { ':pk': 'SPOOL#spool-1', ':skPrefix': 'EVENT#' },
  });
});

test('returns an empty array when there are none', async () => {
  ddbMock.on(QueryCommand).resolves({ Items: undefined });

  const result = await listUsageEvents('spool-1');

  expect(result).toEqual([]);
});
