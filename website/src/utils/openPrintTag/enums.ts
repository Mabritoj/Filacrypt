import type { MaterialTag, MaterialType, NfcWriteProtection } from '../../api/types/openPrintTag';

/*
 * Spec ordinal -> vocabulary string.
 *
 * READ THIS BEFORE TOUCHING EITHER OF THESE TABLES.
 *
 * OpenPrintTag stores enum values on the tag as integer ordinals. Those
 * ordinals are assigned explicitly in the spec's YAML and are NOT contiguous
 * or alphabetical -- new vocabulary entries are appended at the next free
 * number, wherever they belong semantically.
 *
 * The MATERIAL_TYPES / MATERIAL_TAGS arrays in api/types/openPrintTag.ts are
 * grouped by category for UI display, so their array indices do NOT match the
 * spec ordinals. Indexing those arrays by ordinal silently mis-decodes
 * 32 of 43 material types and 68 of 72 tags. Two concrete examples:
 *
 *   spec ordinal 11 = PA66     but MATERIAL_TYPES[11] = 'PA612'
 *   spec ordinal 23 = glitter  but MATERIAL_TAGS[23]  = 'matte'
 *
 * A real Prusament glitter spool would import as "matte" and nobody would
 * ever notice. So: always go through these tables, never through array
 * position. enums.test.ts asserts the two disagree, so the trap stays
 * documented if the arrays are ever reordered.
 *
 * Source of truth: github.com/OpenPrintTag/openprinttag-specification
 *   data/material_type_enum.yaml, data/tags_enum.yaml,
 *   data/write_protection_enum.yaml
 */

export const MATERIAL_TYPE_BY_ORDINAL: Readonly<Record<number, MaterialType>> = {
  0: 'PLA',
  1: 'PETG',
  2: 'TPU',
  3: 'ABS',
  4: 'ASA',
  5: 'PC',
  6: 'PCTG',
  7: 'PP',
  8: 'PA6',
  9: 'PA11',
  10: 'PA12',
  11: 'PA66',
  12: 'CPE',
  13: 'TPE',
  14: 'HIPS',
  15: 'PHA',
  16: 'PET',
  17: 'PEI',
  18: 'PBT',
  19: 'PVB',
  20: 'PVA',
  21: 'PEKK',
  22: 'PEEK',
  23: 'BVOH',
  24: 'TPC',
  25: 'PPS',
  26: 'PPSU',
  27: 'PVC',
  28: 'PEBA',
  29: 'PVDF',
  30: 'PPA',
  31: 'PCL',
  32: 'PES',
  33: 'PMMA',
  34: 'POM',
  35: 'PPE',
  36: 'PS',
  37: 'PSU',
  38: 'TPI',
  39: 'SBS',
  40: 'OBC',
  41: 'EVA',
  // Appended late by the spec -- this is the entry the display array puts at
  // index 11, which is what shifts every subsequent index out of alignment.
  42: 'PA612',
};

/**
 * Ordinal 18 is deliberately absent: the spec marks it `deprecated: true`, so
 * it is a hole in the ordinal space. That is why there are 73 ordinals (0-72)
 * but only 72 entries in MATERIAL_TAGS.
 */
export const MATERIAL_TAG_BY_ORDINAL: Readonly<Record<number, MaterialTag>> = {
  0: 'filtration_recommended',
  1: 'biocompatible',
  2: 'antibacterial',
  3: 'air_filtering',
  4: 'abrasive',
  5: 'foaming',
  6: 'self_extinguishing',
  7: 'paramagnetic',
  8: 'radiation_shielding',
  9: 'high_temperature',
  10: 'esd_safe',
  11: 'conductive',
  12: 'blend',
  13: 'water_soluble',
  14: 'ipa_soluble',
  15: 'limonene_soluble',
  16: 'matte',
  17: 'silk',
  // 18 deprecated -- intentionally omitted
  19: 'translucent',
  20: 'transparent',
  21: 'iridescent',
  22: 'pearlescent',
  23: 'glitter',
  24: 'glow_in_the_dark',
  25: 'neon',
  26: 'illuminescent_color_change',
  27: 'temperature_color_change',
  28: 'gradual_color_change',
  29: 'coextruded',
  30: 'contains_carbon',
  31: 'contains_carbon_fiber',
  32: 'contains_carbon_nano_tubes',
  33: 'contains_glass',
  34: 'contains_glass_fiber',
  35: 'contains_kevlar',
  36: 'contains_stone',
  37: 'contains_magnetite',
  38: 'contains_organic_material',
  39: 'contains_cork',
  40: 'contains_wax',
  41: 'contains_wood',
  42: 'contains_bamboo',
  43: 'contains_pine',
  44: 'contains_ceramic',
  45: 'contains_boron_carbide',
  46: 'contains_metal',
  47: 'contains_bronze',
  48: 'contains_iron',
  49: 'contains_steel',
  50: 'contains_silver',
  51: 'contains_copper',
  52: 'contains_aluminium',
  53: 'contains_brass',
  54: 'contains_tungsten',
  55: 'imitates_wood',
  56: 'imitates_metal',
  57: 'imitates_marble',
  58: 'imitates_stone',
  59: 'lithophane',
  60: 'recycled',
  61: 'home_compostable',
  62: 'industrially_compostable',
  63: 'bio_based',
  64: 'low_outgassing',
  65: 'without_pigments',
  66: 'contains_algae',
  67: 'castable',
  68: 'contains_ptfe',
  69: 'limited_edition',
  70: 'emi_shielding',
  71: 'high_speed',
  72: 'contains_graphene',
};

export const NFC_WRITE_PROTECTION_BY_ORDINAL: Readonly<Record<number, NfcWriteProtection>> = {
  0: 'no',
  1: 'irreversible',
  2: 'protect_page_unlockable',
};

export function materialTypeFromOrdinal(ordinal: number): MaterialType | undefined {
  return MATERIAL_TYPE_BY_ORDINAL[ordinal];
}

export function materialTagFromOrdinal(ordinal: number): MaterialTag | undefined {
  return MATERIAL_TAG_BY_ORDINAL[ordinal];
}

export function writeProtectionFromOrdinal(ordinal: number): NfcWriteProtection | undefined {
  return NFC_WRITE_PROTECTION_BY_ORDINAL[ordinal];
}
