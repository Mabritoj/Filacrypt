import { describe, expect, it } from 'vitest';
import { decodeOpenPrintTag } from '../../utils/openPrintTag/decode';
import {
  REAL_PRUSAMENT_PC_CF_PAYLOAD_HEX,
  REAL_PRUSAMENT_SERIAL_NUMBER,
  hexToBytes,
} from '../../utils/openPrintTag/fixtures';
import type { OpenPrintTagPayload } from '../../utils/openPrintTag/types';
import type { Workspace } from '../../api/types';
import {
  inferTagStandard,
  normaliseSerialNumber,
  payloadToReviewValues,
  payloadToSpoolExtras,
  payloadToTagStatus,
  pickDisplayTag,
} from './tagToSpool';

function realPayload(): OpenPrintTagPayload {
  const result = decodeOpenPrintTag(hexToBytes(REAL_PRUSAMENT_PC_CF_PAYLOAD_HEX));
  if (!result.ok) throw new Error(`fixture failed to decode: ${result.message}`);
  return result.payload;
}

const emptyPayload: OpenPrintTagPayload = {
  tags: [],
  filamentDiameterMm: 1.75,
  aux: {},
  unknownMainKeys: [],
  unknownTagOrdinals: [],
};

const workspace: Workspace = {
  id: 'ws-1',
  name: 'My Workspace',
  ownerId: 'user-1',
  lowStockThresholdG: 200,
  defaultDiameterMm: 1.75,
  defaultEmptySpoolWeightG: 215,
  createdAt: '2025-01-01T00:00:00.000Z',
  callerRole: 'owner',
};

describe('normaliseSerialNumber', () => {
  it('reverses 8-byte ISO 15693 serials, which Chrome reports LSB-first', () => {
    // Chrome gave us this for a real ICODE tag; the E0 manufacturer prefix
    // only appears once the bytes are reversed.
    expect(normaliseSerialNumber(REAL_PRUSAMENT_SERIAL_NUMBER)).toBe('E0:04:01:08:66:2F:D9:3C');
  });

  it('leaves 7-byte NTAG serials in the order reported', () => {
    expect(normaliseSerialNumber('04:a2:b3:c4:d5:e6:f7')).toBe('04:A2:B3:C4:D5:E6:F7');
  });

  it('handles an empty serial without throwing', () => {
    expect(normaliseSerialNumber('')).toBe('');
  });
});

describe('inferTagStandard', () => {
  it('recognises ISO 15693 from an 8-byte E0-prefixed uid', () => {
    expect(inferTagStandard('E0:04:01:08:66:2F:D9:3C')).toBe('NFC-V (ISO 15693)');
  });

  it('recognises NTAG from a 7-byte 04-prefixed uid', () => {
    expect(inferTagStandard('04:A2:B3:C4:D5:E6:F7')).toBe('NFC-A (NTAG)');
  });

  it('falls back to a generic label rather than guessing', () => {
    expect(inferTagStandard('AA:BB:CC')).toBe('NFC');
  });
});

describe('pickDisplayTag', () => {
  it('prefers the visually-defining finish over encoding order', () => {
    // A real tag lists tags in its own order; "glitter" is what a person
    // would call the finish, not "abrasive".
    expect(pickDisplayTag(['contains_carbon_fiber', 'abrasive', 'glitter'])).toBe('glitter');
  });

  it('falls back to the first tag when none are finishes', () => {
    expect(pickDisplayTag(['abrasive', 'blend'])).toBe('abrasive');
  });

  it('falls back to matte when the tag carries no tags at all', () => {
    expect(pickDisplayTag([])).toBe('matte');
  });
});

describe('payloadToReviewValues', () => {
  it('maps a real Prusament tag into the review form', () => {
    const values = payloadToReviewValues(realPayload(), workspace);
    expect(values.brand).toBe('Prusament');
    expect(values.materialName).toBe('PC Blend Carbon Fiber Black');
    expect(values.materialType).toBe('PC');
    expect(values.colorHex).toBe('#262727');
    expect(values.emptyContainerWeightG).toBe(277);
    expect(values.minNozzleTempC).toBe(275);
    expect(values.maxNozzleTempC).toBe(295);
    expect(values.bedTempC).toBe(100);
    expect(values.filamentDiameterMm).toBe(1.75);
  });

  it('prefers the actual net weight over the advertised nominal weight', () => {
    // The real tag reports nominal 800 g but actual 868 g.
    expect(payloadToReviewValues(realPayload(), workspace).netWeightG).toBe(868);
  });

  it('falls back to nominal weight when no actual weight is present', () => {
    const values = payloadToReviewValues({ ...emptyPayload, nominalNetWeightG: 750 }, workspace);
    expect(values.netWeightG).toBe(750);
  });

  it('falls back to workspace defaults for fields the tag omits', () => {
    const values = payloadToReviewValues(emptyPayload, workspace);
    expect(values.emptyContainerWeightG).toBe(215);
    expect(values.materialType).toBe('PLA');
    expect(values.brand).toBe('');
  });

  it('marks the spool full only when the tag reports no consumed weight', () => {
    expect(payloadToReviewValues(emptyPayload, workspace).markFull).toBe(true);
    expect(
      payloadToReviewValues({ ...emptyPayload, aux: { consumedWeightG: 120 } }, workspace).markFull,
    ).toBe(false);
  });
});

describe('payloadToSpoolExtras', () => {
  it('carries through the fields the review form has no slot for', () => {
    const extras = payloadToSpoolExtras(realPayload());
    expect(extras.densityGCm3).toBe(1.22);
    expect(extras.actualNetWeightG).toBe(868);
    expect(extras.totalLengthMm).toBe(271554);
    expect(extras.gtin).toBeDefined();
    expect(extras.serial).toBe('bf26593917');
    expect(extras.manufacturedAt).toMatch(/^2025-/);
  });

  it('emits no undefined-valued keys, so it is safe to spread', () => {
    const extras = payloadToSpoolExtras(emptyPayload);
    expect(Object.values(extras).every((value) => value !== undefined)).toBe(true);
    expect(Object.keys(extras)).toHaveLength(0);
  });
});

describe('payloadToTagStatus', () => {
  const scannedAt = '2026-07-26T10:00:00.000Z';

  it('builds tag status from a real scan', () => {
    const status = payloadToTagStatus(realPayload(), REAL_PRUSAMENT_SERIAL_NUMBER, 245, scannedAt);
    expect(status.uid).toBe('E0:04:01:08:66:2F:D9:3C');
    expect(status.standard).toBe('NFC-V (ISO 15693)');
    expect(status.healthy).toBe(true);
    expect(status.lastScannedAt).toBe(scannedAt);
    expect(status.memoryUsedBytes).toBe(245);
  });

  it('leaves total capacity undefined because Web NFC cannot report it', () => {
    const status = payloadToTagStatus(realPayload(), REAL_PRUSAMENT_SERIAL_NUMBER, 245, scannedAt);
    expect(status.memoryTotalBytes).toBeUndefined();
  });

  it('defaults write protection to "no" when the tag omits it', () => {
    expect(
      payloadToTagStatus(emptyPayload, '04:a2:b3:c4:d5:e6:f7', 10, scannedAt).writeProtection,
    ).toBe('no');
  });
});
