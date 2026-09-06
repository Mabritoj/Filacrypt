import { decodeSequence } from 'cbor2';
import {
  materialTagFromOrdinal,
  materialTypeFromOrdinal,
  writeProtectionFromOrdinal,
} from './enums';
import type { OpenPrintTagDecodeResult, OpenPrintTagPayload } from './types';

/**
 * The NDEF record MIME type OpenPrintTag data is carried in. Real tags also
 * carry other records alongside it (a product URL, for instance), so consumers
 * must select by media type rather than taking the first record.
 */
export const OPENPRINTTAG_MIME_TYPE = 'application/vnd.openprinttag';

/** Meta-section keys (spec: data/meta_fields.yaml). */
const META_MAIN_REGION_OFFSET = 1;
const META_AUX_REGION_OFFSET = 2;

/** Main-section keys (spec: data/main_fields.yaml). */
const MAIN = {
  instanceUuid: 0,
  packageUuid: 1,
  materialUuid: 2,
  brandUuid: 3,
  gtin: 4,
  brandSpecificInstanceId: 5,
  materialType: 9,
  materialName: 10,
  brandName: 11,
  writeProtection: 13,
  manufacturedDate: 14,
  nominalNetWeight: 16,
  actualNetWeight: 17,
  emptyContainerWeight: 18,
  primaryColor: 19,
  tags: 28,
  density: 29,
  filamentDiameter: 30,
  minPrintTemperature: 34,
  maxPrintTemperature: 35,
  preheatTemperature: 36,
  minBedTemperature: 37,
  maxBedTemperature: 38,
  minChamberTemperature: 39,
  maxChamberTemperature: 40,
  chamberTemperature: 41,
  nominalFullLength: 53,
  actualFullLength: 54,
} as const;

/** Auxiliary-section keys (spec: data/aux_fields.yaml). */
const AUX_CONSUMED_WEIGHT = 0;

/**
 * Keys we knowingly read but don't surface, so they aren't reported as
 * "unknown". These describe the physical spool geometry and material class,
 * none of which the app models today.
 */
const KNOWN_UNMAPPED_MAIN_KEYS = new Set([
  6, 7, 8, 12, 15, 20, 21, 22, 23, 24, 25, 26, 27, 31, 32, 33, 42, 43, 44, 45, 46, 47, 48, 49, 50,
  51, 52, 55, 56, 57, 58, 59, 60,
]);

/** The spec's stated default when a tag omits filament_diameter. */
const DEFAULT_FILAMENT_DIAMETER_MM = 1.75;

type CborMap = Map<unknown, unknown>;

function isMap(value: unknown): value is CborMap {
  return value instanceof Map;
}

function asNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'bigint') return Number(value);
  return undefined;
}

function asInteger(value: unknown): number | undefined {
  const n = asNumber(value);
  return n === undefined ? undefined : Math.round(n);
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

/**
 * Half-float and single-float encodings introduce artefacts -- the reference
 * tag stores density 1.22 as 1.2197265625. Round to a sane precision rather
 * than surfacing the raw IEEE value.
 */
function roundTo(value: number, decimals: number): number {
  return Number(value.toFixed(decimals));
}

function toHexColor(value: unknown): string | undefined {
  if (!(value instanceof Uint8Array) || value.length < 3) return undefined;
  const [r, g, b] = value;
  return `#${[r, g, b].map((c) => c.toString(16).padStart(2, '0')).join('')}`;
}

function toUuid(value: unknown): string | undefined {
  if (!(value instanceof Uint8Array) || value.length !== 16) return undefined;
  const hex = Array.from(value)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20),
  ].join('-');
}

/** Spec timestamps are UNIX seconds. */
function toIsoDate(value: unknown): string | undefined {
  const seconds = asNumber(value);
  if (seconds === undefined || seconds <= 0) return undefined;
  const date = new Date(seconds * 1000);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

function decodeFirstItem(bytes: Uint8Array): unknown {
  const iterator = decodeSequence(bytes, { preferMap: true })[Symbol.iterator]();
  const first = iterator.next();
  return first.done ? undefined : first.value;
}

/**
 * Decodes an OpenPrintTag NDEF payload (the bytes of the
 * `application/vnd.openprinttag` record) into a normalised payload.
 *
 * Regions are laid out inside this same payload: the meta section sits at
 * offset 0, and its offsets are payload-relative. When main_region_offset is
 * absent the main section begins immediately after the meta item, which is
 * simply the next item in the CBOR sequence. Regions are zero-padded to their
 * allocated size, so decoding must tolerate trailing bytes -- hence
 * decodeSequence rather than decode, which rejects trailing data.
 */
export function decodeOpenPrintTag(bytes: Uint8Array): OpenPrintTagDecodeResult {
  if (bytes.byteLength === 0) {
    return { ok: false, reason: 'empty', message: 'Tag payload was empty.' };
  }

  const warnings: string[] = [];

  let meta: unknown;
  let main: unknown;
  try {
    const iterator = decodeSequence(bytes, { preferMap: true })[Symbol.iterator]();
    meta = iterator.next().value;

    if (!isMap(meta)) {
      return {
        ok: false,
        reason: 'meta-not-a-map',
        message: 'Meta section was not a CBOR map.',
      };
    }

    const mainOffset = asInteger(meta.get(META_MAIN_REGION_OFFSET));
    if (mainOffset === undefined) {
      main = iterator.next().value;
    } else {
      if (mainOffset < 0 || mainOffset >= bytes.byteLength) {
        return {
          ok: false,
          reason: 'region-out-of-bounds',
          message: `Main region offset ${mainOffset} is outside the ${bytes.byteLength}-byte payload.`,
        };
      }
      main = decodeFirstItem(bytes.subarray(mainOffset));
    }
  } catch (error) {
    return {
      ok: false,
      reason: 'malformed-cbor',
      message: error instanceof Error ? error.message : 'Could not decode tag CBOR.',
    };
  }

  if (!isMap(main)) {
    return { ok: false, reason: 'main-not-a-map', message: 'Main section was not a CBOR map.' };
  }

  const unknownMainKeys: number[] = [];
  const unknownTagOrdinals: number[] = [];
  const mappedKeys = new Set<number>(Object.values(MAIN));

  for (const key of main.keys()) {
    const numeric = asInteger(key);
    if (numeric === undefined) continue;
    if (!mappedKeys.has(numeric) && !KNOWN_UNMAPPED_MAIN_KEYS.has(numeric)) {
      unknownMainKeys.push(numeric);
    }
  }

  const tags: OpenPrintTagPayload['tags'] = [];
  const rawTags = main.get(MAIN.tags);
  if (Array.isArray(rawTags)) {
    for (const entry of rawTags) {
      const ordinal = asInteger(entry);
      if (ordinal === undefined) continue;
      const tag = materialTagFromOrdinal(ordinal);
      if (tag) {
        tags.push(tag);
      } else {
        unknownTagOrdinals.push(ordinal);
      }
    }
  }

  const materialTypeOrdinal = asInteger(main.get(MAIN.materialType));
  const materialType =
    materialTypeOrdinal === undefined ? undefined : materialTypeFromOrdinal(materialTypeOrdinal);
  if (materialTypeOrdinal !== undefined && materialType === undefined) {
    warnings.push(`Unknown material_type ordinal ${materialTypeOrdinal}.`);
  }

  const writeProtectionOrdinal = asInteger(main.get(MAIN.writeProtection));
  const density = asNumber(main.get(MAIN.density));
  const diameter = asNumber(main.get(MAIN.filamentDiameter));
  const gtin = main.get(MAIN.gtin);

  let aux: OpenPrintTagPayload['aux'] = {};
  const auxOffset = asInteger(meta.get(META_AUX_REGION_OFFSET));
  if (auxOffset !== undefined) {
    if (auxOffset < 0 || auxOffset >= bytes.byteLength) {
      warnings.push(`Aux region offset ${auxOffset} is outside the payload; ignoring aux data.`);
    } else {
      try {
        const auxSection = decodeFirstItem(bytes.subarray(auxOffset));
        if (isMap(auxSection)) {
          aux = { consumedWeightG: asNumber(auxSection.get(AUX_CONSUMED_WEIGHT)) };
        } else {
          warnings.push('Aux section was not a CBOR map; ignoring aux data.');
        }
      } catch {
        // Aux is optional and printer-mutable -- a corrupt aux region must not
        // invalidate otherwise-good main data.
        warnings.push('Aux section could not be decoded; ignoring aux data.');
      }
    }
  }

  const payload: OpenPrintTagPayload = {
    instanceUuid: toUuid(main.get(MAIN.instanceUuid)),
    packageUuid: toUuid(main.get(MAIN.packageUuid)),
    materialUuid: toUuid(main.get(MAIN.materialUuid)),
    brandUuid: toUuid(main.get(MAIN.brandUuid)),
    gtin: asNumber(gtin) !== undefined ? String(asNumber(gtin)) : asString(gtin),
    brandSpecificInstanceId: asString(main.get(MAIN.brandSpecificInstanceId)),

    materialType,
    materialName: asString(main.get(MAIN.materialName)),
    brandName: asString(main.get(MAIN.brandName)),
    tags,
    primaryColorHex: toHexColor(main.get(MAIN.primaryColor)),

    filamentDiameterMm:
      diameter === undefined ? DEFAULT_FILAMENT_DIAMETER_MM : roundTo(diameter, 3),
    densityGCm3: density === undefined ? undefined : roundTo(density, 3),
    nominalNetWeightG: asInteger(main.get(MAIN.nominalNetWeight)),
    actualNetWeightG: asInteger(main.get(MAIN.actualNetWeight)),
    emptyContainerWeightG: asInteger(main.get(MAIN.emptyContainerWeight)),
    nominalFullLengthMm: asInteger(main.get(MAIN.nominalFullLength)),
    actualFullLengthMm: asInteger(main.get(MAIN.actualFullLength)),

    minNozzleTempC: asInteger(main.get(MAIN.minPrintTemperature)),
    maxNozzleTempC: asInteger(main.get(MAIN.maxPrintTemperature)),
    preheatTempC: asInteger(main.get(MAIN.preheatTemperature)),
    minBedTempC: asInteger(main.get(MAIN.minBedTemperature)),
    maxBedTempC: asInteger(main.get(MAIN.maxBedTemperature)),
    minChamberTempC: asInteger(main.get(MAIN.minChamberTemperature)),
    maxChamberTempC: asInteger(main.get(MAIN.maxChamberTemperature)),
    idealChamberTempC: asInteger(main.get(MAIN.chamberTemperature)),

    manufacturedAt: toIsoDate(main.get(MAIN.manufacturedDate)),
    writeProtection:
      writeProtectionOrdinal === undefined
        ? undefined
        : writeProtectionFromOrdinal(writeProtectionOrdinal),

    aux,
    unknownMainKeys,
    unknownTagOrdinals,
  };

  if (unknownTagOrdinals.length > 0) {
    warnings.push(`Skipped unknown tag ordinals: ${unknownTagOrdinals.join(', ')}.`);
  }
  if (unknownMainKeys.length > 0) {
    warnings.push(`Skipped unknown main keys: ${unknownMainKeys.join(', ')}.`);
  }

  return { ok: true, payload, warnings };
}
