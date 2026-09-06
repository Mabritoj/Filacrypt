import type { MaterialTag, MaterialType, NfcWriteProtection } from '../../api/types';

/**
 * A decoded OpenPrintTag payload, normalised into the units and shapes the app
 * uses. Almost everything is optional: the spec only guarantees that a reader
 * can skip what it doesn't understand, and real tags omit plenty (the
 * reference Prusament tag has no filament_diameter, for instance).
 */
export interface OpenPrintTagPayload {
  // Identity
  instanceUuid?: string;
  packageUuid?: string;
  materialUuid?: string;
  brandUuid?: string;
  gtin?: string;
  brandSpecificInstanceId?: string;

  // Material
  materialType?: MaterialType;
  materialName?: string;
  brandName?: string;
  tags: MaterialTag[];
  primaryColorHex?: string;

  // Physical
  /** Defaulted to 1.75 when the tag omits it, per the spec. */
  filamentDiameterMm: number;
  densityGCm3?: number;
  nominalNetWeightG?: number;
  actualNetWeightG?: number;
  emptyContainerWeightG?: number;
  nominalFullLengthMm?: number;
  actualFullLengthMm?: number;

  // Print settings
  minNozzleTempC?: number;
  maxNozzleTempC?: number;
  preheatTempC?: number;
  minBedTempC?: number;
  maxBedTempC?: number;
  minChamberTempC?: number;
  maxChamberTempC?: number;
  idealChamberTempC?: number;

  // Provenance
  manufacturedAt?: string;
  writeProtection?: NfcWriteProtection;

  // Auxiliary (printer-updatable) region
  aux: {
    consumedWeightG?: number;
  };

  /**
   * Field keys and enum ordinals we didn't recognise. Kept rather than dropped
   * so a newer spec revision shows up as diagnosable data instead of silence.
   */
  unknownMainKeys: number[];
  unknownTagOrdinals: number[];
}

export type OpenPrintTagDecodeFailure =
  'empty' | 'malformed-cbor' | 'meta-not-a-map' | 'main-not-a-map' | 'region-out-of-bounds';

export type OpenPrintTagDecodeResult =
  | { ok: true; payload: OpenPrintTagPayload; warnings: string[] }
  | { ok: false; reason: OpenPrintTagDecodeFailure; message: string };
