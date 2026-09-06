import {
  searchSpools,
  getWorkspaceSummary,
  getSpoolById,
  type SpoolFilters,
} from './spool-search.js';
import { COLOR_FAMILIES } from './color-family.js';
import { MATERIAL_TYPES, MATERIAL_TAGS, SPOOL_STATUSES } from './vocabularies.js';

export const TOOL_DEFINITIONS = [
  {
    name: 'search_spools',
    description:
      'Search the filament spools in this workspace. All parameters are optional and combine with AND. ' +
      'Call with no parameters to list every spool. Use this for any question about which spools exist, ' +
      'what colours or materials are on hand, or what is running low.',
    input_schema: {
      type: 'object',
      additionalProperties: false,
      properties: {
        colorFamily: {
          type: 'string',
          enum: [...COLOR_FAMILIES],
          description: 'Filter by colour name, resolved from each spool\'s hex colour.',
        },
        materialType: {
          type: 'string',
          enum: [...MATERIAL_TYPES],
          description: 'Filament material, e.g. PLA or PETG.',
        },
        tag: {
          type: 'string',
          enum: [...MATERIAL_TAGS],
          description:
            'Filament property tag, e.g. silk, matte, glow_in_the_dark, contains_carbon_fiber, water_soluble.',
        },
        brand: { type: 'string', description: 'Brand name; matched case-insensitively.' },
        nameContains: {
          type: 'string',
          description: 'Substring of the product name, e.g. "Galaxy". Matched case-insensitively.',
        },
        diameterMm: { type: 'number', enum: [1.75, 2.85, 3.0], description: 'Filament diameter.' },
        storageLocation: {
          type: 'string',
          description: 'Where the spool is stored, e.g. "Shelf A". Matched case-insensitively.',
        },
        status: { type: 'string', enum: [...SPOOL_STATUSES] },
        lowStockOnly: {
          type: 'boolean',
          description: "Only spools below this workspace's low-stock threshold.",
        },
      },
      required: [],
    },
  },
  {
    name: 'get_spool_details',
    description:
      'Get every field for one spool, including nozzle, bed and chamber temperatures, drying profile, ' +
      'purchase information and NFC tag state. Use this after search_spools when the question needs ' +
      'print settings or other detail.',
    input_schema: {
      type: 'object',
      additionalProperties: false,
      properties: { spoolId: { type: 'string', description: 'The spool id from search_spools.' } },
      required: ['spoolId'],
    },
  },
  {
    name: 'get_workspace_summary',
    description:
      'Totals across the whole workspace: spool count, total filament remaining in grams, number of ' +
      'distinct brands, how many spools are low, and a count per material type.',
    input_schema: { type: 'object', additionalProperties: false, properties: {}, required: [] },
  },
];

export interface ToolOutcome {
  result: unknown;
  spoolIds: string[];
}

/**
 * workspaceId comes from the already-membership-checked path value, never from
 * the model. Any workspaceId in `input` is dropped on the floor.
 */
export async function dispatchTool(
  name: string,
  input: Record<string, unknown>,
  workspaceId: string,
): Promise<ToolOutcome> {
  if (name === 'search_spools') {
    const { workspaceId: _ignored, ...filters } = input;
    const spools = await searchSpools(workspaceId, filters as SpoolFilters);
    return { result: spools, spoolIds: spools.map((s) => s.id) };
  }

  if (name === 'get_spool_details') {
    const spoolId = String(input.spoolId ?? '');
    const spool = await getSpoolById(workspaceId, spoolId);
    if (!spool) {
      return { result: { error: `Spool ${spoolId} not found in this workspace.` }, spoolIds: [] };
    }
    return { result: spool, spoolIds: [spool.id] };
  }

  if (name === 'get_workspace_summary') {
    return { result: await getWorkspaceSummary(workspaceId), spoolIds: [] };
  }

  return { result: { error: `Unknown tool: ${name}` }, spoolIds: [] };
}
