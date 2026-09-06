import type { NewSpool } from '../../api/spools';
import type { MaterialTag, SpoolNfcTagStatus, Workspace } from '../../api/types';
import type { OpenPrintTagPayload } from '../../utils/openPrintTag/types';
import type { ReviewFormValues } from './ReviewForm';

/**
 * Finishes worth showing in the form's single "finish" select, most
 * visually-defining first. A tag carries a whole array of properties, but the
 * form only has one slot, so pick the one a person would actually call the
 * spool's finish rather than whichever happened to be encoded first.
 */
const DISPLAY_TAG_PRIORITY: MaterialTag[] = [
  'glitter',
  'silk',
  'matte',
  'iridescent',
  'pearlescent',
  'translucent',
  'transparent',
  'glow_in_the_dark',
  'neon',
  'gradual_color_change',
  'temperature_color_change',
  'illuminescent_color_change',
  'coextruded',
  'without_pigments',
];

const FALLBACK_FINISH: MaterialTag = 'matte';

export function pickDisplayTag(tags: MaterialTag[]): MaterialTag {
  const preferred = DISPLAY_TAG_PRIORITY.find((candidate) => tags.includes(candidate));
  return preferred ?? tags[0] ?? FALLBACK_FINISH;
}

/**
 * Chrome reports ISO 15693 serial numbers least-significant-byte first, so a
 * real ICODE tag arrives as "3c:d9:2f:66:08:01:04:e0" when its actual UID is
 * E0:04:01:08:66:2F:D9:3C. The E0 prefix (ISO/IEC 7816-6 manufacturer code)
 * only appears once reversed, and every other surface in the app displays
 * UIDs most-significant-byte first, so normalise here.
 *
 * 7-byte NFC-A (NTAG) UIDs are already reported most-significant first and are
 * left alone.
 */
export function normaliseSerialNumber(serialNumber: string): string {
  const bytes = serialNumber.split(':').filter((part) => part.length > 0);
  if (bytes.length === 0) return '';
  const ordered = bytes.length === 8 ? [...bytes].reverse() : bytes;
  return ordered.map((byte) => byte.toUpperCase().padStart(2, '0')).join(':');
}

/**
 * Web NFC exposes no tag-technology discriminator -- only a serial number --
 * so the standard has to be inferred from the UID shape. This is a heuristic,
 * not a fact reported by the platform: ISO 15693 UIDs are 8 bytes beginning
 * E0, NTAG UIDs are 7 bytes beginning 04.
 */
export function inferTagStandard(normalisedUid: string): string {
  const bytes = normalisedUid.split(':');
  if (bytes.length === 8 && bytes[0] === 'E0') return 'NFC-V (ISO 15693)';
  if (bytes.length === 7 && bytes[0] === '04') return 'NFC-A (NTAG)';
  return 'NFC';
}

export function payloadToReviewValues(
  payload: OpenPrintTagPayload,
  workspace: Workspace | undefined,
): ReviewFormValues {
  // Prefer the measured weight over the advertised one: a tag that reports
  // both is telling us the spool really weighs the actual figure.
  const netWeightG = payload.actualNetWeightG ?? payload.nominalNetWeightG ?? 1000;

  return {
    brand: payload.brandName ?? '',
    materialName: payload.materialName ?? '',
    materialType: payload.materialType ?? 'PLA',
    finish: pickDisplayTag(payload.tags),
    colorHex: payload.primaryColorHex ?? '#9a9a9a',
    netWeightG,
    filamentDiameterMm: payload.filamentDiameterMm,
    emptyContainerWeightG:
      payload.emptyContainerWeightG ?? workspace?.defaultEmptySpoolWeightG ?? 215,
    minNozzleTempC: payload.minNozzleTempC ?? 200,
    maxNozzleTempC: payload.maxNozzleTempC ?? 220,
    bedTempC: payload.minBedTempC ?? 60,
    markFull: payload.aux.consumedWeightG === undefined,
  };
}

/**
 * Everything the review form has no field for. `Spool` already models these --
 * they exist precisely because of OpenPrintTag -- so dropping them on import
 * would throw away real provenance. Keeping `instanceUuid` in particular is
 * what will later let a rescanned spool be matched to its inventory record.
 *
 * Only defined values are emitted, so this can be spread over a NewSpool
 * without punching `undefined` holes in it.
 */
export function payloadToSpoolExtras(payload: OpenPrintTagPayload): Partial<NewSpool> {
  const extras: Partial<NewSpool> = {};

  if (payload.actualNetWeightG !== undefined) extras.actualNetWeightG = payload.actualNetWeightG;
  if (payload.densityGCm3 !== undefined) extras.densityGCm3 = payload.densityGCm3;
  if (payload.nominalFullLengthMm !== undefined) extras.totalLengthMm = payload.nominalFullLengthMm;
  if (payload.preheatTempC !== undefined) extras.preheatTempC = payload.preheatTempC;
  if (payload.minChamberTempC !== undefined) extras.minChamberTempC = payload.minChamberTempC;
  if (payload.maxChamberTempC !== undefined) extras.maxChamberTempC = payload.maxChamberTempC;
  if (payload.idealChamberTempC !== undefined) extras.idealChamberTempC = payload.idealChamberTempC;
  if (payload.instanceUuid !== undefined) extras.instanceUuid = payload.instanceUuid;
  if (payload.packageUuid !== undefined) extras.packageUuid = payload.packageUuid;
  if (payload.materialUuid !== undefined) extras.materialUuid = payload.materialUuid;
  if (payload.brandUuid !== undefined) extras.brandUuid = payload.brandUuid;
  if (payload.gtin !== undefined) extras.gtin = payload.gtin;
  if (payload.brandSpecificInstanceId !== undefined)
    extras.serial = payload.brandSpecificInstanceId;
  if (payload.manufacturedAt !== undefined) extras.manufacturedAt = payload.manufacturedAt;

  return extras;
}

export function payloadToTagStatus(
  payload: OpenPrintTagPayload,
  serialNumber: string,
  payloadByteLength: number,
  scannedAt: string,
): SpoolNfcTagStatus {
  const uid = normaliseSerialNumber(serialNumber);
  return {
    uid,
    standard: inferTagStandard(uid),
    writeProtection: payload.writeProtection ?? 'no',
    healthy: true,
    lastScannedAt: scannedAt,
    memoryUsedBytes: payloadByteLength,
    // Deliberately omitted: Web NFC cannot report a tag's total capacity, and
    // inventing a plausible number would be worse than showing nothing.
  };
}
