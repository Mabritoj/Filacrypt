// Env vars and the `awslambda` runtime global are set in jest.setup.cjs — both
// have to exist before this file's imports evaluate, which is too early to do here.

jest.mock('workspace-auth', () => ({
  assertFilamentPermission: jest.fn(),
  verifyBearerToken: jest.fn(),
  ForbiddenError: class ForbiddenError extends Error {},
  UnauthorizedError: class UnauthorizedError extends Error {},
}));
jest.mock('./tools.js', () => ({
  TOOL_DEFINITIONS: [{ name: 'search_spools' }],
  dispatchTool: jest.fn(),
}));

import { assertFilamentPermission, verifyBearerToken } from 'workspace-auth';
import { dispatchTool } from './tools.js';
import { NdjsonWriter } from './stream.js';
import { runChat } from './index.js';

const mockVerify = verifyBearerToken as jest.Mock;
const mockAssertFilamentPermission = assertFilamentPermission as jest.Mock;
const mockDispatch = dispatchTool as jest.Mock;

function makeWriter() {
  const chunks: string[] = [];
  return {
    chunks,
    writer: new NdjsonWriter({ write: (c: string) => chunks.push(c) }),
    events: () => chunks.map((c) => JSON.parse(c)),
  };
}

/** A fake Bedrock client whose stream() returns queued responses in order. */
function fakeBedrock(responses: unknown[]) {
  const calls: unknown[] = [];
  let i = 0;
  return {
    calls,
    messages: {
      stream: (params: unknown) => {
        calls.push(params);
        const response = responses[i++];
        return {
          async *[Symbol.asyncIterator]() {
            const blocks = (response as { content: { type: string; text?: string }[] }).content;
            for (const block of blocks) {
              if (block.type === 'text') {
                yield {
                  type: 'content_block_delta',
                  delta: { type: 'text_delta', text: block.text },
                };
              }
            }
          },
          finalMessage: async () => response,
        };
      },
    },
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockVerify.mockResolvedValue('user-1');
  mockAssertFilamentPermission.mockResolvedValue(undefined);
});

test('streams assistant text then done for a single-turn answer', async () => {
  const { writer, events } = makeWriter();
  const bedrock = fakeBedrock([
    { stop_reason: 'end_turn', content: [{ type: 'text', text: 'You have 3 spools.' }] },
  ]);

  await runChat(
    { authHeader: 'Bearer t', workspaceId: 'ws-1', messages: [{ role: 'user', content: 'hi' }] },
    writer,
    { bedrock: bedrock as never },
  );

  expect(events()).toEqual([
    { type: 'text', delta: 'You have 3 spools.' },
    { type: 'done' },
  ]);
});

test('runs a tool call and emits its spool ids before the answer', async () => {
  mockDispatch.mockResolvedValue({ result: [{ id: 'sp-1' }], spoolIds: ['sp-1'] });
  const { writer, events } = makeWriter();
  const bedrock = fakeBedrock([
    {
      stop_reason: 'tool_use',
      content: [
        { type: 'tool_use', id: 'tu-1', name: 'search_spools', input: { colorFamily: 'black' } },
      ],
    },
    { stop_reason: 'end_turn', content: [{ type: 'text', text: 'One black spool.' }] },
  ]);

  await runChat(
    { authHeader: 'Bearer t', workspaceId: 'ws-1', messages: [{ role: 'user', content: 'black?' }] },
    writer,
    { bedrock: bedrock as never },
  );

  expect(mockDispatch).toHaveBeenCalledWith('search_spools', { colorFamily: 'black' }, 'ws-1');
  expect(events()).toEqual([
    { type: 'spools', ids: ['sp-1'] },
    { type: 'text', delta: 'One black spool.' },
    { type: 'done' },
  ]);
});

test('passes the caller workspace to the membership check', async () => {
  const { writer } = makeWriter();
  const bedrock = fakeBedrock([{ stop_reason: 'end_turn', content: [] }]);

  await runChat({ authHeader: 'Bearer t', workspaceId: 'ws-9', messages: [] }, writer, {
    bedrock: bedrock as never,
  });

  expect(mockAssertFilamentPermission).toHaveBeenCalledWith('user-1', 'ws-9', 'read');
});

test('stops after the iteration cap and reports it', async () => {
  mockDispatch.mockResolvedValue({ result: {}, spoolIds: [] });
  const toolTurn = {
    stop_reason: 'tool_use',
    content: [{ type: 'tool_use', id: 'tu', name: 'search_spools', input: {} }],
  };
  const { writer, events } = makeWriter();
  const bedrock = fakeBedrock(Array.from({ length: 10 }, () => toolTurn));

  await runChat({ authHeader: 'Bearer t', workspaceId: 'ws-1', messages: [] }, writer, {
    bedrock: bedrock as never,
  });

  expect(bedrock.calls.length).toBeLessThanOrEqual(5);
  expect(events().at(-2)).toMatchObject({ type: 'error' });
  expect(events().at(-1)).toEqual({ type: 'done' });
});

test('sends no effort, thinking or cache_control parameters', async () => {
  const { writer } = makeWriter();
  const bedrock = fakeBedrock([{ stop_reason: 'end_turn', content: [] }]);

  await runChat({ authHeader: 'Bearer t', workspaceId: 'ws-1', messages: [] }, writer, {
    bedrock: bedrock as never,
  });

  const params = bedrock.calls[0] as Record<string, unknown>;
  expect(params).not.toHaveProperty('output_config');
  expect(params).not.toHaveProperty('thinking');
  expect(params.model).toBe('us.anthropic.claude-haiku-4-5-20251001-v1:0');
  expect(params.max_tokens).toBe(4096);
  expect(JSON.stringify(params)).not.toContain('cache_control');
});
