import { mockClient } from 'aws-sdk-client-mock';
import { DynamoDBDocumentClient, GetCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { searchSpools, getWorkspaceSummary } from './spool-search.js';

const ddbMock = mockClient(DynamoDBDocumentClient);

function spool(overrides: Record<string, unknown> = {}) {
  return {
    PK: 'WORKSPACE#ws-1', SK: 'SPOOL#spool-1', type: 'SPOOL',
    id: 'spool-1', workspaceId: 'ws-1', brand: 'Prusament', materialType: 'PLA',
    materialName: 'Galaxy Black', tags: ['glitter'], colorHex: '#000000',
    netWeightG: 1000, remainingWeightG: 720, filamentDiameterMm: 1.75,
    status: 'in_use', storageLocation: 'Shelf A', addedBy: 'user-1',
    createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

const WORKSPACE_ITEM = {
  PK: 'WORKSPACE#ws-1', SK: 'METADATA',
  id: 'ws-1', name: 'Shop', ownerId: 'user-1', lowStockThresholdG: 200,
  defaultDiameterMm: 1.75, defaultEmptySpoolWeightG: 215,
  createdAt: '2026-01-01T00:00:00.000Z',
};

beforeEach(() => ddbMock.reset());

test('searchSpools returns a trimmed record, not the full item', async () => {
  ddbMock.on(QueryCommand).resolves({ Items: [spool()] });

  const result = await searchSpools('ws-1', {});

  expect(result).toHaveLength(1);
  expect(result[0]).toEqual({
    id: 'spool-1', brand: 'Prusament', materialType: 'PLA',
    materialName: 'Galaxy Black', colorHex: '#000000', tags: ['glitter'],
    filamentDiameterMm: 1.75, remainingWeightG: 720, netWeightG: 1000,
    status: 'in_use', storageLocation: 'Shelf A',
  });
  expect(result[0]).not.toHaveProperty('addedBy');
  expect(result[0]).not.toHaveProperty('PK');
});

test('searchSpools aliases the reserved word status in the FilterExpression', async () => {
  ddbMock.on(QueryCommand).resolves({ Items: [] });

  await searchSpools('ws-1', { status: 'stored' });

  const input = ddbMock.commandCalls(QueryCommand)[0].args[0].input;
  expect(input.FilterExpression).toContain('#status = :status');
  expect(input.ExpressionAttributeNames).toMatchObject({ '#status': 'status' });
  expect(input.ExpressionAttributeValues).toMatchObject({ ':status': 'stored' });
});

test('searchSpools pushes materialType and tag into the FilterExpression', async () => {
  ddbMock.on(QueryCommand).resolves({ Items: [] });

  await searchSpools('ws-1', { materialType: 'PETG', tag: 'silk' });

  const input = ddbMock.commandCalls(QueryCommand)[0].args[0].input;
  expect(input.FilterExpression).toContain('materialType = :materialType');
  expect(input.FilterExpression).toContain('contains(tags, :tag)');
});

test('searchSpools sends no FilterExpression when no pushdown filter is given', async () => {
  ddbMock.on(QueryCommand).resolves({ Items: [] });

  await searchSpools('ws-1', { brand: 'Prusament' });

  const input = ddbMock.commandCalls(QueryCommand)[0].args[0].input;
  expect(input.FilterExpression).toBeUndefined();
});

test('searchSpools filters by colour family in the Lambda', async () => {
  ddbMock.on(QueryCommand).resolves({
    Items: [
      spool({ id: 'black', colorHex: '#000000' }),
      spool({ id: 'red', colorHex: '#ff0000' }),
    ],
  });

  const result = await searchSpools('ws-1', { colorFamily: 'black' });

  expect(result.map((s) => s.id)).toEqual(['black']);
});

test('searchSpools matches brand, nameContains and storageLocation case-insensitively', async () => {
  ddbMock.on(QueryCommand).resolves({ Items: [spool()] });

  expect(await searchSpools('ws-1', { brand: 'prusament' })).toHaveLength(1);
  expect(await searchSpools('ws-1', { nameContains: 'galaxy' })).toHaveLength(1);
  expect(await searchSpools('ws-1', { storageLocation: 'shelf a' })).toHaveLength(1);
});

test('searchSpools matches diameter within tolerance', async () => {
  ddbMock.on(QueryCommand).resolves({
    Items: [spool({ id: 'a', filamentDiameterMm: 1.74 }), spool({ id: 'b', filamentDiameterMm: 2.85 })],
  });

  const result = await searchSpools('ws-1', { diameterMm: 1.75 });

  expect(result.map((s) => s.id)).toEqual(['a']);
});

test('searchSpools compares lowStockOnly against the workspace threshold', async () => {
  ddbMock.on(GetCommand).resolves({ Item: WORKSPACE_ITEM });
  ddbMock.on(QueryCommand).resolves({
    Items: [spool({ id: 'low', remainingWeightG: 150 }), spool({ id: 'fine', remainingWeightG: 800 })],
  });

  const result = await searchSpools('ws-1', { lowStockOnly: true });

  expect(result.map((s) => s.id)).toEqual(['low']);
});

test('searchSpools reads every page', async () => {
  ddbMock
    .on(QueryCommand)
    .resolvesOnce({ Items: [spool({ id: 'a' })], LastEvaluatedKey: { PK: 'x', SK: 'y' } })
    .resolves({ Items: [spool({ id: 'b' })] });

  const result = await searchSpools('ws-1', {});

  expect(result.map((s) => s.id)).toEqual(['a', 'b']);
});

test('getWorkspaceSummary aggregates across all spools', async () => {
  ddbMock.on(GetCommand).resolves({ Item: WORKSPACE_ITEM });
  ddbMock.on(QueryCommand).resolves({
    Items: [
      spool({ id: 'a', brand: 'Prusament', materialType: 'PLA', remainingWeightG: 100 }),
      spool({ id: 'b', brand: 'Prusament', materialType: 'PETG', remainingWeightG: 800 }),
      spool({ id: 'c', brand: 'Polymaker', materialType: 'PLA', remainingWeightG: 500 }),
    ],
  });

  const result = await getWorkspaceSummary('ws-1');

  expect(result).toEqual({
    spoolCount: 3,
    totalRemainingG: 1400,
    brandCount: 2,
    lowStockCount: 1,
    byMaterial: { PLA: 2, PETG: 1 },
  });
});
