import { mockClient } from 'aws-sdk-client-mock';
import { DynamoDBDocumentClient, GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { config } from 'env-config';
import { getWorkspace, updateWorkspace } from './workspace-lookup.js';

const ddbMock = mockClient(DynamoDBDocumentClient);

beforeEach(() => ddbMock.reset());

test('getWorkspace returns null when the item does not exist', async () => {
  ddbMock.on(GetCommand).resolves({ Item: undefined });

  const result = await getWorkspace('ws-missing');

  expect(result).toBeNull();
});

test('getWorkspace strips internal keys and returns the workspace', async () => {
  ddbMock.on(GetCommand).resolves({
    Item: {
      PK: 'WORKSPACE#ws-1', SK: 'METADATA', type: 'WORKSPACE',
      id: 'ws-1', name: 'My Workspace', ownerId: 'user-1',
      lowStockThresholdG: 150, defaultDiameterMm: 1.75, defaultEmptySpoolWeightG: 200,
      createdAt: '2026-01-01T00:00:00.000Z',
    },
  });

  const result = await getWorkspace('ws-1');

  expect(result).toEqual({
    id: 'ws-1', name: 'My Workspace', ownerId: 'user-1',
    lowStockThresholdG: 150, defaultDiameterMm: 1.75, defaultEmptySpoolWeightG: 200,
    defaultPrinterId: undefined,
    createdAt: '2026-01-01T00:00:00.000Z',
  });
  expect(ddbMock.commandCalls(GetCommand)[0].args[0].input).toMatchObject({
    TableName: config.tableName,
    Key: { PK: 'WORKSPACE#ws-1', SK: 'METADATA' },
  });
});

test('getWorkspace backfills missing default-setting fields', async () => {
  ddbMock.on(GetCommand).resolves({
    Item: {
      PK: 'WORKSPACE#ws-old', SK: 'METADATA', type: 'WORKSPACE',
      id: 'ws-old', name: 'Old Workspace', ownerId: 'user-1',
      createdAt: '2025-01-01T00:00:00.000Z',
    },
  });

  const result = await getWorkspace('ws-old');

  expect(result).toMatchObject({
    lowStockThresholdG: 200,
    defaultDiameterMm: 1.75,
    defaultEmptySpoolWeightG: 215,
  });
});

test('updateWorkspace returns null when the workspace does not exist', async () => {
  const conditionalError = Object.assign(new Error('conditional check failed'), {
    name: 'ConditionalCheckFailedException',
  });
  ddbMock.on(UpdateCommand).rejects(conditionalError);

  const result = await updateWorkspace('ws-missing', { lowStockThresholdG: 100 });

  expect(result).toBeNull();
});

test('updateWorkspace applies a partial update and returns the merged result', async () => {
  ddbMock.on(UpdateCommand).resolves({
    Attributes: {
      PK: 'WORKSPACE#ws-1', SK: 'METADATA', type: 'WORKSPACE',
      id: 'ws-1', name: 'My Workspace', ownerId: 'user-1',
      lowStockThresholdG: 100, defaultDiameterMm: 1.75, defaultEmptySpoolWeightG: 215,
      createdAt: '2026-01-01T00:00:00.000Z',
    },
  });

  const result = await updateWorkspace('ws-1', { lowStockThresholdG: 100 });

  expect(result?.lowStockThresholdG).toBe(100);
  const call = ddbMock.commandCalls(UpdateCommand)[0];
  expect(call.args[0].input).toMatchObject({
    TableName: config.tableName,
    Key: { PK: 'WORKSPACE#ws-1', SK: 'METADATA' },
    ConditionExpression: 'attribute_exists(PK)',
    ReturnValues: 'ALL_NEW',
  });
});
