import { mockClient } from 'aws-sdk-client-mock';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { queryAll, omitDynamoKeys } from './index.js';

const ddbMock = mockClient(DynamoDBDocumentClient);

beforeEach(() => ddbMock.reset());

test('queryAll follows LastEvaluatedKey until exhausted', async () => {
  ddbMock
    .on(QueryCommand)
    .resolvesOnce({ Items: [{ id: 'a' }], LastEvaluatedKey: { PK: 'p', SK: 's1' } })
    .resolvesOnce({ Items: [{ id: 'b' }], LastEvaluatedKey: { PK: 'p', SK: 's2' } })
    .resolves({ Items: [{ id: 'c' }] });

  const client = DynamoDBDocumentClient.from(new DynamoDBClient({}));
  const result = await queryAll(client, { TableName: 't' });

  expect(result).toEqual([{ id: 'a' }, { id: 'b' }, { id: 'c' }]);
  expect(ddbMock.commandCalls(QueryCommand)).toHaveLength(3);
});

test('queryAll passes the previous LastEvaluatedKey as ExclusiveStartKey', async () => {
  ddbMock
    .on(QueryCommand)
    .resolvesOnce({ Items: [], LastEvaluatedKey: { PK: 'p', SK: 's1' } })
    .resolves({ Items: [] });

  const client = DynamoDBDocumentClient.from(new DynamoDBClient({}));
  await queryAll(client, { TableName: 't' });

  const calls = ddbMock.commandCalls(QueryCommand);
  expect(calls[0].args[0].input.ExclusiveStartKey).toBeUndefined();
  expect(calls[1].args[0].input.ExclusiveStartKey).toEqual({ PK: 'p', SK: 's1' });
});

test('queryAll returns an empty array when there are no items', async () => {
  ddbMock.on(QueryCommand).resolves({ Items: undefined });

  const client = DynamoDBDocumentClient.from(new DynamoDBClient({}));
  const result = await queryAll(client, { TableName: 't' });

  expect(result).toEqual([]);
});

test('omitDynamoKeys strips the internal keys and keeps everything else', () => {
  const result = omitDynamoKeys<{ id: string; name: string }>({
    PK: 'WORKSPACE#ws-1',
    SK: 'SPOOL#spool-1',
    type: 'SPOOL',
    id: 'spool-1',
    name: 'Galaxy Black',
  });

  expect(result).toEqual({ id: 'spool-1', name: 'Galaxy Black' });
});
