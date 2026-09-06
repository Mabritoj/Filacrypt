/*
 * These arrays are the OpenPrintTag controlled vocabularies, ordered for UI
 * display (grouped by category). Their array indices are NOT the spec's enum
 * ordinals -- e.g. MATERIAL_TYPES[11] is 'PA612' but spec ordinal 11 is
 * 'PA66', and MATERIAL_TAGS[23] is 'matte' but spec ordinal 23 is 'glitter'.
 *
 * When decoding a real NFC tag, always map ordinals through the lookup tables
 * in utils/openPrintTag/enums.ts. Never index these arrays by ordinal.
 */

export const MATERIAL_TYPES = [
  'PLA',
  'PETG',
  'TPU',
  'ABS',
  'ASA',
  'PC',
  'PCTG',
  'PP',
  'PA6',
  'PA11',
  'PA12',
  'PA612',
  'PA66',
  'CPE',
  'TPE',
  'HIPS',
  'PHA',
  'PET',
  'PEI',
  'PBT',
  'PVB',
  'PVA',
  'PEKK',
  'PEEK',
  'BVOH',
  'TPC',
  'PPS',
  'PPSU',
  'PVC',
  'PEBA',
  'PVDF',
  'PPA',
  'PCL',
  'PES',
  'PMMA',
  'POM',
  'PPE',
  'PS',
  'PSU',
  'TPI',
  'SBS',
  'OBC',
  'EVA',
] as const;

export type MaterialType = (typeof MATERIAL_TYPES)[number];

export const MATERIAL_TAGS = [
  // biological
  'filtration_recommended',
  'biocompatible',
  'home_compostable',
  'industrially_compostable',
  'bio_based',
  'antibacterial',
  'air_filtering',
  // physical
  'abrasive',
  'foaming',
  'castable',
  'self_extinguishing',
  'paramagnetic',
  'radiation_shielding',
  'high_temperature',
  'high_speed',
  // electrical
  'esd_safe',
  'conductive',
  'emi_shielding',
  // chemical
  'blend',
  'water_soluble',
  'ipa_soluble',
  'limonene_soluble',
  'low_outgassing',
  // visual
  'matte',
  'silk',
  'translucent',
  'transparent',
  'without_pigments',
  'iridescent',
  'pearlescent',
  'glitter',
  'glow_in_the_dark',
  'neon',
  'illuminescent_color_change',
  'temperature_color_change',
  'gradual_color_change',
  'coextruded',
  // organic additives
  'contains_organic_material',
  'contains_cork',
  'contains_wax',
  'contains_wood',
  'contains_algae',
  'contains_bamboo',
  'contains_pine',
  // metal additives
  'contains_metal',
  'contains_bronze',
  'contains_iron',
  'contains_steel',
  'contains_silver',
  'contains_copper',
  'contains_aluminium',
  'contains_brass',
  'contains_tungsten',
  // other additives
  'contains_carbon',
  'contains_carbon_fiber',
  'contains_carbon_nano_tubes',
  'contains_graphene',
  'contains_glass',
  'contains_glass_fiber',
  'contains_kevlar',
  'contains_ptfe',
  'contains_stone',
  'contains_magnetite',
  'contains_ceramic',
  'contains_boron_carbide',
  // imitation
  'imitates_wood',
  'imitates_metal',
  'imitates_marble',
  'imitates_stone',
  // other
  'lithophane',
  'recycled',
  'limited_edition',
] as const;

export type MaterialTag = (typeof MATERIAL_TAGS)[number];

export const MATERIAL_CERTIFICATIONS = ['ul_2818', 'ul_94_v0', 'ul_2904'] as const;

export type MaterialCertification = (typeof MATERIAL_CERTIFICATIONS)[number];

export const NFC_WRITE_PROTECTIONS = ['no', 'irreversible', 'protect_page_unlockable'] as const;

export type NfcWriteProtection = (typeof NFC_WRITE_PROTECTIONS)[number];
