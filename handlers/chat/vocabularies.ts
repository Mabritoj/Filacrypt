/**
 * Hand-mirrored from website/src/api/types/openPrintTag.ts. The website and the
 * backend are independent TypeScript projects with no shared package, so these
 * vocabularies are duplicated rather than imported — the same arrangement
 * docs/api.md describes for the domain types. Keep both copies in sync.
 */
export const MATERIAL_TYPES = [
  'PLA', 'PETG', 'TPU', 'ABS', 'ASA', 'PC', 'PCTG', 'PP', 'PA6', 'PA11',
  'PA12', 'PA612', 'PA66', 'CPE', 'TPE', 'HIPS', 'PHA', 'PET', 'PEI', 'PBT',
  'PVB', 'PVA', 'PEKK', 'PEEK', 'BVOH', 'TPC', 'PPS', 'PPSU', 'PVC', 'PEBA',
  'PVDF', 'PPA', 'PCL', 'PES', 'PMMA', 'POM', 'PPE', 'PS', 'PSU', 'TPI',
  'SBS', 'OBC', 'EVA',
] as const;

export const MATERIAL_TAGS = [
  'filtration_recommended', 'biocompatible', 'home_compostable',
  'industrially_compostable', 'bio_based', 'antibacterial', 'air_filtering',
  'abrasive', 'foaming', 'castable', 'self_extinguishing', 'paramagnetic',
  'radiation_shielding', 'high_temperature', 'high_speed', 'esd_safe',
  'conductive', 'emi_shielding', 'blend', 'water_soluble', 'ipa_soluble',
  'limonene_soluble', 'low_outgassing', 'matte', 'silk', 'translucent',
  'transparent', 'without_pigments', 'iridescent', 'pearlescent', 'glitter',
  'glow_in_the_dark', 'neon', 'illuminescent_color_change',
  'temperature_color_change', 'gradual_color_change', 'coextruded',
  'contains_organic_material', 'contains_cork', 'contains_wax', 'contains_wood',
  'contains_algae', 'contains_bamboo', 'contains_pine', 'contains_metal',
  'contains_bronze', 'contains_iron', 'contains_steel', 'contains_silver',
  'contains_copper', 'contains_aluminium', 'contains_brass', 'contains_tungsten',
  'contains_carbon', 'contains_carbon_fiber', 'contains_carbon_nano_tubes',
  'contains_graphene', 'contains_glass', 'contains_glass_fiber',
  'contains_kevlar', 'contains_ptfe', 'contains_stone', 'contains_magnetite',
  'contains_ceramic', 'contains_boron_carbide', 'imitates_wood',
  'imitates_metal', 'imitates_marble', 'imitates_stone', 'lithophane',
  'recycled', 'limited_edition',
] as const;

export const SPOOL_STATUSES = ['in_use', 'stored', 'empty', 'archived'] as const;
