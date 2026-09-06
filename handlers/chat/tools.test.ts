jest.mock('./spool-search.js', () => ({
  searchSpools: jest.fn(),
  getWorkspaceSummary: jest.fn(),
  getSpoolById: jest.fn(),
}));

import { searchSpools, getWorkspaceSummary, getSpoolById } from './spool-search.js';
import { TOOL_DEFINITIONS, dispatchTool } from './tools.js';

const mockSearch = searchSpools as jest.Mock;
const mockSummary = getWorkspaceSummary as jest.Mock;
const mockGetSpool = getSpoolById as jest.Mock;

beforeEach(() => jest.clearAllMocks());

test('exposes exactly three tools', () => {
  expect(TOOL_DEFINITIONS.map((t) => (t as { name: string }).name)).toEqual([
    'search_spools',
    'get_spool_details',
    'get_workspace_summary',
  ]);
});

test('no tool schema accepts a workspaceId parameter', () => {
  for (const tool of TOOL_DEFINITIONS as { input_schema: { properties?: object } }[]) {
    expect(Object.keys(tool.input_schema.properties ?? {})).not.toContain('workspaceId');
  }
});

// No `strict: true`. Strict tool use is part of structured outputs, which Claude
// in Amazon Bedrock does not support — sending it risks a 400 on every request.
// The schemas stay closed (`additionalProperties: false`), and dispatchTool
// defends against unexpected input on its own.
test('every tool schema is closed and none claims strict validation', () => {
  for (const tool of TOOL_DEFINITIONS as {
    strict?: boolean;
    input_schema: { additionalProperties: boolean };
  }[]) {
    expect(tool.strict).toBeUndefined();
    expect(tool.input_schema.additionalProperties).toBe(false);
  }
});

test('search_spools dispatch uses the caller workspace and returns matching ids', async () => {
  mockSearch.mockResolvedValue([{ id: 'a' }, { id: 'b' }]);

  const out = await dispatchTool('search_spools', { colorFamily: 'black' }, 'ws-1');

  expect(mockSearch).toHaveBeenCalledWith('ws-1', { colorFamily: 'black' });
  expect(out.spoolIds).toEqual(['a', 'b']);
});

test('dispatch ignores a workspaceId the model tries to supply', async () => {
  mockSearch.mockResolvedValue([]);

  await dispatchTool('search_spools', { workspaceId: 'ws-evil', brand: 'X' }, 'ws-1');

  expect(mockSearch).toHaveBeenCalledWith('ws-1', { brand: 'X' });
});

test('get_spool_details returns the spool and its id', async () => {
  mockGetSpool.mockResolvedValue({ id: 'spool-1', brand: 'Prusament' });

  const out = await dispatchTool('get_spool_details', { spoolId: 'spool-1' }, 'ws-1');

  expect(mockGetSpool).toHaveBeenCalledWith('ws-1', 'spool-1');
  expect(out.spoolIds).toEqual(['spool-1']);
});

test('get_spool_details reports not-found without throwing', async () => {
  mockGetSpool.mockResolvedValue(null);

  const out = await dispatchTool('get_spool_details', { spoolId: 'nope' }, 'ws-1');

  expect(out.spoolIds).toEqual([]);
  expect(out.result).toMatchObject({ error: expect.stringContaining('not found') });
});

test('get_workspace_summary emits no spool ids', async () => {
  mockSummary.mockResolvedValue({ spoolCount: 3 });

  const out = await dispatchTool('get_workspace_summary', {}, 'ws-1');

  expect(out.spoolIds).toEqual([]);
  expect(out.result).toEqual({ spoolCount: 3 });
});

test('an unknown tool name returns an error result rather than throwing', async () => {
  const out = await dispatchTool('delete_everything', {}, 'ws-1');

  expect(out.result).toMatchObject({ error: expect.stringContaining('Unknown tool') });
});
