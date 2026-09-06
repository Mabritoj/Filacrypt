import { mockClient } from 'aws-sdk-client-mock';
import {
  DynamoDBDocumentClient,
  DeleteCommand,
  GetCommand,
  PutCommand,
  QueryCommand,
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb';
import { config } from 'env-config';
import { listSpools, getSpool, createSpool, updateSpool, deleteSpool } from './spools-lookup.js';

const ddbMock = mockClient(DynamoDBDocumentClient);
const SAMPLE_SPOOL_ITEM = {
  PK: 'WORKSPACE#ws-1', SK: 'SPOOL#spool-1', type: 'SPOOL',
  id: 'spool-1', workspaceId: 'ws-1', brand: 'Prusament', materialType: 'PLA',
  materialName: 'Galaxy Black', tags: ['glitter'], netWeightG: 1000, remainingWeightG: 720,
  filamentDiameterMm: 1.75, status: 'in_use', addedBy: 'user-1',
  createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z',
};

beforeEach(() => ddbMock.reset());

test('listSpools queries by workspace PK and SPOOL# prefix, strips internal keys', async () => {
  ddbMock.on(QueryCommand).resolves({ Items: [SAMPLE_SPOOL_ITEM] });

  const result = await listSpools('ws-1');

  expect(result).toHaveLength(1);
  expect(result[0]).not.toHaveProperty('PK');
  expect(result[0].id).toBe('spool-1');
  const call = ddbMock.commandCalls(QueryCommand)[0];
  expect(call.args[0].input).toMatchObject({
    TableName: config.tableName,
    KeyConditionExpression: 'PK = :pk AND begins_with(SK, :skPrefix)',
    ExpressionAttributeValues: { ':pk': 'WORKSPACE#ws-1', ':skPrefix': 'SPOOL#' },
  });
});

test('listSpools returns an empty array when there are none', async () => {
  ddbMock.on(QueryCommand).resolves({ Items: undefined });

  const result = await listSpools('ws-1');

  expect(result).toEqual([]);
});

test('getSpool returns null when not found', async () => {
  ddbMock.on(GetCommand).resolves({ Item: undefined });

  const result = await getSpool('ws-1', 'spool-missing');

  expect(result).toBeNull();
});

test('getSpool returns the spool, scoped to the given workspace', async () => {
  ddbMock.on(GetCommand).resolves({ Item: SAMPLE_SPOOL_ITEM });

  const result = await getSpool('ws-1', 'spool-1');

  expect(result?.id).toBe('spool-1');
  const call = ddbMock.commandCalls(GetCommand)[0];
  expect(call.args[0].input).toMatchObject({
    TableName: config.tableName,
    Key: { PK: 'WORKSPACE#ws-1', SK: 'SPOOL#spool-1' },
  });
});

test('createSpool writes a new item and returns it with server-derived id/workspaceId/addedBy/timestamps', async () => {
  ddbMock.on(PutCommand).resolves({});

  const result = await createSpool('ws-1', 'user-1', {
    brand: 'Prusament', materialType: 'PLA', materialName: 'Galaxy Black',
    tags: ['glitter'], netWeightG: 1000, remainingWeightG: 1000,
    filamentDiameterMm: 1.75, status: 'in_use',
  });

  expect(result.workspaceId).toBe('ws-1');
  expect(result.addedBy).toBe('user-1');
  expect(typeof result.id).toBe('string');
  expect(result.id.length).toBeGreaterThan(0);
  expect(result.createdAt).toBe(result.updatedAt);

  const call = ddbMock.commandCalls(PutCommand)[0];
  expect(call.args[0].input).toMatchObject({
    TableName: config.tableName,
    ConditionExpression: 'attribute_not_exists(PK)',
  });
  expect(call.args[0].input.Item).toMatchObject({
    PK: `WORKSPACE#ws-1`,
    SK: `SPOOL#${result.id}`,
    type: 'SPOOL',
    workspaceId: 'ws-1',
    addedBy: 'user-1',
    brand: 'Prusament',
  });
});

test('updateSpool returns null when the spool does not exist', async () => {
  const conditionalError = Object.assign(new Error('conditional check failed'), {
    name: 'ConditionalCheckFailedException',
  });
  ddbMock.on(UpdateCommand).rejects(conditionalError);

  const result = await updateSpool('ws-1', 'spool-missing', { brand: 'New Brand' });

  expect(result).toBeNull();
});

test('updateSpool applies a partial update and returns the merged result', async () => {
  ddbMock.on(UpdateCommand).resolves({
    Attributes: { ...SAMPLE_SPOOL_ITEM, brand: 'New Brand' },
  });

  const result = await updateSpool('ws-1', 'spool-1', { brand: 'New Brand' });

  expect(result?.brand).toBe('New Brand');
  const call = ddbMock.commandCalls(UpdateCommand)[0];
  expect(call.args[0].input).toMatchObject({
    TableName: config.tableName,
    Key: { PK: 'WORKSPACE#ws-1', SK: 'SPOOL#spool-1' },
    ConditionExpression: 'attribute_exists(PK)',
    ReturnValues: 'ALL_NEW',
  });
});

test('updateSpool always bumps updatedAt server-side, even though the caller did not ask for it', async () => {
  ddbMock.on(UpdateCommand).resolves({
    Attributes: { ...SAMPLE_SPOOL_ITEM, brand: 'New Brand', updatedAt: '2026-06-01T00:00:00.000Z' },
  });

  await updateSpool('ws-1', 'spool-1', { brand: 'New Brand' });

  const call = ddbMock.commandCalls(UpdateCommand)[0];
  const names = call.args[0].input.ExpressionAttributeNames as Record<string, string>;
  const values = call.args[0].input.ExpressionAttributeValues as Record<string, unknown>;
  const updatedAtNameKey = Object.entries(names).find(([, v]) => v === 'updatedAt')?.[0];

  expect(updatedAtNameKey).toBeDefined();
  const updatedAtValueKey = updatedAtNameKey!.replace('#k', ':v');
  expect(typeof values[updatedAtValueKey]).toBe('string');
});

test('deleteSpool returns false when the spool does not exist', async () => {
  const conditionalError = Object.assign(new Error('conditional check failed'), {
    name: 'ConditionalCheckFailedException',
  });
  ddbMock.on(DeleteCommand).rejects(conditionalError);

  const result = await deleteSpool('ws-1', 'spool-missing');

  expect(result).toBe(false);
});

test('deleteSpool deletes the item and returns true', async () => {
  ddbMock.on(DeleteCommand).resolves({});

  const result = await deleteSpool('ws-1', 'spool-1');

  expect(result).toBe(true);
  const call = ddbMock.commandCalls(DeleteCommand)[0];
  expect(call.args[0].input).toMatchObject({
    TableName: config.tableName,
    Key: { PK: 'WORKSPACE#ws-1', SK: 'SPOOL#spool-1' },
    ConditionExpression: 'attribute_exists(PK)',
  });
});

test('listSpools returns items from every page, not just the first', async () => {
  const second = { ...SAMPLE_SPOOL_ITEM, SK: 'SPOOL#spool-2', id: 'spool-2' };
  ddbMock
    .on(QueryCommand)
    .resolvesOnce({ Items: [SAMPLE_SPOOL_ITEM], LastEvaluatedKey: { PK: 'WORKSPACE#ws-1', SK: 'SPOOL#spool-1' } })
    .resolves({ Items: [second] });

  const result = await listSpools('ws-1');

  expect(result.map((s) => s.id)).toEqual(['spool-1', 'spool-2']);
});
