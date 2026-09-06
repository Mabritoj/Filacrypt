import { describe, expect, it } from 'vitest';
import { MATERIAL_TAGS, MATERIAL_TYPES } from '../../api/types/openPrintTag';
import {
  MATERIAL_TAG_BY_ORDINAL,
  MATERIAL_TYPE_BY_ORDINAL,
  NFC_WRITE_PROTECTION_BY_ORDINAL,
  materialTagFromOrdinal,
  materialTypeFromOrdinal,
  writeProtectionFromOrdinal,
} from './enums';

describe('OpenPrintTag ordinal tables', () => {
  it('does not agree with display-array indices, which is exactly why it exists', () => {
    // If these ever start matching, someone reordered the display arrays to
    // spec order -- at which point re-verify against the spec YAML rather than
    // assuming the lookup tables became redundant.
    expect(MATERIAL_TYPE_BY_ORDINAL[11]).toBe('PA66');
    expect(MATERIAL_TYPES[11]).toBe('PA612');

    expect(MATERIAL_TYPE_BY_ORDINAL[42]).toBe('PA612');
    expect(MATERIAL_TYPES[42]).toBe('EVA');

    expect(MATERIAL_TAG_BY_ORDINAL[23]).toBe('glitter');
    expect(MATERIAL_TAGS[23]).toBe('matte');

    expect(MATERIAL_TAG_BY_ORDINAL[16]).toBe('matte');
    expect(MATERIAL_TAGS[16]).toBe('conductive');
  });

  it('covers every value in the display vocabularies exactly once', () => {
    const mappedTypes = Object.values(MATERIAL_TYPE_BY_ORDINAL);
    expect([...mappedTypes].sort()).toEqual([...MATERIAL_TYPES].sort());
    expect(new Set(mappedTypes).size).toBe(mappedTypes.length);

    const mappedTags = Object.values(MATERIAL_TAG_BY_ORDINAL);
    expect([...mappedTags].sort()).toEqual([...MATERIAL_TAGS].sort());
    expect(new Set(mappedTags).size).toBe(mappedTags.length);
  });

  it('leaves ordinal 18 empty because the spec deprecated it', () => {
    expect(MATERIAL_TAG_BY_ORDINAL[18]).toBeUndefined();
    // 73 ordinals (0-72) minus the deprecated hole = 72 usable tags.
    expect(Object.keys(MATERIAL_TAG_BY_ORDINAL)).toHaveLength(72);
    expect(MATERIAL_TAGS).toHaveLength(72);
  });

  it('decodes the material types seen on real tags', () => {
    expect(materialTypeFromOrdinal(0)).toBe('PLA');
    // Prusament PC Blend Carbon Fiber Black, read from a real ICODE tag.
    expect(materialTypeFromOrdinal(5)).toBe('PC');
  });

  it('decodes the tag set from a real Prusament PC Blend Carbon Fiber spool', () => {
    const ordinals = [31, 12, 4, 30];
    expect(ordinals.map(materialTagFromOrdinal)).toEqual([
      'contains_carbon_fiber',
      'blend',
      'abrasive',
      'contains_carbon',
    ]);
  });

  it('maps write protection ordinals', () => {
    expect(writeProtectionFromOrdinal(0)).toBe('no');
    expect(writeProtectionFromOrdinal(2)).toBe('protect_page_unlockable');
    expect(Object.keys(NFC_WRITE_PROTECTION_BY_ORDINAL)).toHaveLength(3);
  });

  it('returns undefined for unknown ordinals instead of throwing', () => {
    // The spec requires implementations to skip unknown keys rather than fail,
    // so newer vocabulary entries must degrade quietly.
    expect(materialTypeFromOrdinal(999)).toBeUndefined();
    expect(materialTagFromOrdinal(999)).toBeUndefined();
    expect(materialTagFromOrdinal(18)).toBeUndefined();
    expect(writeProtectionFromOrdinal(-1)).toBeUndefined();
  });
});
