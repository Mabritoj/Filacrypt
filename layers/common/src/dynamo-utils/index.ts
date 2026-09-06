import {
  DynamoDBDocumentClient,
  QueryCommand,
  type QueryCommandInput,
} from '@aws-sdk/lib-dynamodb';

/**
 * Runs a Query to exhaustion. DynamoDB returns at most 1MB per call and signals
 * more data with LastEvaluatedKey; ignoring it silently truncates the result.
 */
export async function queryAll(
  client: DynamoDBDocumentClient,
  input: QueryCommandInput,
): Promise<Record<string, unknown>[]> {
  const items: Record<string, unknown>[] = [];
  let cursor: Record<string, unknown> | undefined;

  do {
    const result = await client.send(
      new QueryCommand({ ...input, ExclusiveStartKey: cursor }),
    );
    items.push(...(result.Items ?? []));
    cursor = result.LastEvaluatedKey;
  } while (cursor);

  return items;
}

/** Strips the single-table internal keys before an item crosses an API boundary. */
export function omitDynamoKeys<T>(item: Record<string, unknown>): T {
  const { PK, SK, type, ...rest } = item;
  return rest as T;
}
