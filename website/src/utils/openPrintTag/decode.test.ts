import { describe, expect, it } from 'vitest';
import { decodeOpenPrintTag } from './decode';
import {
  MINIMAL_NO_AUX_PAYLOAD_HEX,
  REAL_PRUSAMENT_PC_CF_PAYLOAD_HEX,
  UNKNOWN_KEYS_PAYLOAD_HEX,
  VECTOR_01_PAYLOAD_HEX,
  hexToBytes,
} from './fixtures';

function decodeHex(hex: string) {
  return decodeOpenPrintTag(hexToBytes(hex));
}

describe('decodeOpenPrintTag', () => {
  describe('a real Prusament PC Blend Carbon Fiber tag', () => {
    const result = decodeHex(REAL_PRUSAMENT_PC_CF_PAYLOAD_HEX);

    it('decodes successfully', () => {
      expect(result.ok).toBe(true);
    });

    it('reads the material identity', () => {
      if (!result.ok) throw new Error(result.message);
      expect(result.payload.materialType).toBe('PC');
      expect(result.payload.materialName).toBe('PC Blend Carbon Fiber Black');
      expect(result.payload.brandName).toBe('Prusament');
      expect(result.payload.primaryColorHex).toBe('#262727');
    });

    it('maps tag ordinals through the lookup table, not array position', () => {
      if (!result.ok) throw new Error(result.message);
      // On-tag ordinals were [31, 12, 4, 30]. Indexing the display array would
      // have produced entirely different (and plausible-looking) tags.
      expect(result.payload.tags).toEqual([
        'contains_carbon_fiber',
        'blend',
        'abrasive',
        'contains_carbon',
      ]);
    });

    it('reads weights and lengths', () => {
      if (!result.ok) throw new Error(result.message);
      expect(result.payload.nominalNetWeightG).toBe(800);
      expect(result.payload.actualNetWeightG).toBe(868);
      expect(result.payload.emptyContainerWeightG).toBe(277);
      expect(result.payload.nominalFullLengthMm).toBe(271554);
    });

    it('reads print temperatures', () => {
      if (!result.ok) throw new Error(result.message);
      expect(result.payload.minNozzleTempC).toBe(275);
      expect(result.payload.maxNozzleTempC).toBe(295);
      expect(result.payload.minBedTempC).toBe(100);
      expect(result.payload.maxBedTempC).toBe(120);
    });

    it('rounds the half-float density instead of exposing IEEE artefacts', () => {
      if (!result.ok) throw new Error(result.message);
      // Stored as half-float 0xf93ce1, which inflates to 1.2197265625.
      expect(result.payload.densityGCm3).toBe(1.22);
    });

    it('defaults filament diameter to 1.75 when the tag omits it', () => {
      if (!result.ok) throw new Error(result.message);
      expect(result.payload.filamentDiameterMm).toBe(1.75);
    });

    it('handles a present-but-empty aux region', () => {
      if (!result.ok) throw new Error(result.message);
      expect(result.payload.aux.consumedWeightG).toBeUndefined();
    });

    it('recognises every field key on the tag', () => {
      if (!result.ok) throw new Error(result.message);
      expect(result.payload.unknownMainKeys).toEqual([]);
      expect(result.payload.unknownTagOrdinals).toEqual([]);
    });

    it('converts the manufactured timestamp', () => {
      if (!result.ok) throw new Error(result.message);
      expect(result.payload.manufacturedAt).toMatch(/^2025-/);
    });
  });

  describe('official conformance vector 01 (Prusament PLA Galaxy Black)', () => {
    const result = decodeHex(VECTOR_01_PAYLOAD_HEX);

    it('decodes successfully', () => {
      expect(result.ok).toBe(true);
    });

    it('reads identity and the glitter tag', () => {
      if (!result.ok) throw new Error(result.message);
      expect(result.payload.materialType).toBe('PLA');
      expect(result.payload.materialName).toBe('PLA Prusa Galaxy Black');
      expect(result.payload.brandName).toBe('Prusament');
      // Ordinal 23. MATERIAL_TAGS[23] is 'matte' -- the exact silent mis-decode
      // the ordinal table prevents.
      expect(result.payload.tags).toContain('glitter');
      expect(result.payload.tags).not.toContain('matte');
    });

    it('reads the 1kg nominal weight', () => {
      if (!result.ok) throw new Error(result.message);
      expect(result.payload.nominalNetWeightG).toBe(1000);
    });
  });

  describe('edge cases', () => {
    it('rejects an empty payload', () => {
      const result = decodeOpenPrintTag(new Uint8Array());
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.reason).toBe('empty');
    });

    it('rejects malformed CBOR', () => {
      const result = decodeOpenPrintTag(Uint8Array.from([0xbf, 0x01]));
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(['malformed-cbor', 'main-not-a-map']).toContain(result.reason);
    });

    it('rejects a meta section that is not a map', () => {
      // 0x01 is the integer 1, not a map.
      const result = decodeOpenPrintTag(Uint8Array.from([0x01, 0xa0]));
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.reason).toBe('meta-not-a-map');
    });

    it('handles a payload with no aux region', () => {
      const result = decodeHex(MINIMAL_NO_AUX_PAYLOAD_HEX);
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.payload.materialType).toBe('PLA');
      expect(result.payload.materialName).toBe('Test');
      expect(result.payload.aux.consumedWeightG).toBeUndefined();
    });

    it('skips unknown field keys and tag ordinals rather than failing', () => {
      const result = decodeHex(UNKNOWN_KEYS_PAYLOAD_HEX);
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.payload.materialType).toBe('PLA');
      expect(result.payload.tags).toEqual(['glitter']);
      expect(result.payload.unknownTagOrdinals).toEqual([200]);
      expect(result.payload.unknownMainKeys).toEqual([9999]);
      expect(result.warnings.join(' ')).toMatch(/9999/);
    });
  });
});
