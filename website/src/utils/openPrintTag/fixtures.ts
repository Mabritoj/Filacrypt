/**
 * Byte fixtures for OpenPrintTag decoding tests.
 *
 * These are the payloads of `application/vnd.openprinttag` NDEF records --
 * i.e. exactly what Web NFC hands us. Note this is NOT the same as the spec
 * repo's `tests/encode_decode/NN_data.bin`, which is a full tag dump including
 * the NDEF TLV wrapper (payload starts at byte 8).
 */

export function hexToBytes(hex: string): Uint8Array {
  const clean = hex.replace(/\s+/g, '');
  const pairs = clean.match(/../g);
  if (!pairs || clean.length % 2 !== 0) {
    throw new Error('hexToBytes: input is not an even-length hex string');
  }
  return Uint8Array.from(pairs.map((byte) => parseInt(byte, 16)));
}

/**
 * Captured from a real Prusament "PC Blend Carbon Fiber Black" spool, read on
 * an Android 10 / Chrome 150 phone via Web NFC from an ICODE (ISO 15693) tag.
 *
 * Exercises the awkward parts of the format in one payload: an indefinite
 * main map (0xbf), an indefinite tags array (0x9f), a half-float density
 * (0xf9), an absent filament_diameter (must default to 1.75), region
 * zero-padding, and an empty-but-present aux map.
 */
export const REAL_PRUSAMENT_PC_CF_PAYLOAD_HEX =
  'a10218d2bf041b000007d0fcab481f056a62663236353933393137080009050a781b504320426c656e' +
  '6420436172626f6e20466962657220426c61636b0b6950727573616d656e740e1a692c29cc10190320' +
  '11190364121901151343262727181c9f181f0c04181eff181df93ce11822190113182319012718241' +
  '8aa18251864182618781827183c1829185a182a1843182b18c8182c1865182d183318351a000424c21' +
  '8361a00047f1fff00000000000000000000000000000000000000000000000000000000000000000000' +
  '0000000000a000000000000000000000000000000000000000000000000000000000000000000000';

/** The serial number Chrome reported for that tag -- note the byte order. */
export const REAL_PRUSAMENT_SERIAL_NUMBER = '3c:d9:2f:66:08:01:04:e0';

/**
 * Official conformance vector 01 (Prusament PLA Galaxy Black), assembled from
 * the per-section hex in the spec repo's
 * `tests/encode_decode/01_info.yaml`: meta at payload offset 0 (4 bytes),
 * main at 4 (206 bytes), aux at 210 (35 bytes).
 */
const VECTOR_01_META_HEX = 'a10218d2';

const VECTOR_01_MAIN_HEX =
  'bf041b000007d0fcab45f9056a33333463353466303838080009000a76504c4120507275736120476' +
  '16c61787920426c61636b0b6950727573616d656e740e1a68d3c7d7101903e8111903f41219011813' +
  '443d3e3dff181c9f17ff181df93cf6182218cd182318e1182418aa182518281826183c18271218281' +
  '828182914182a1840182b18c8182c1864182d183418389f0001ff183b831832fa4134cccdfa43014c' +
  'cd183c69323730203330203230ff0000000000000000000000000000000000000000000000000000' +
  '000000';

const VECTOR_01_AUX_HEX = 'a000000000000000000000000000000000000000000000000000000000000000000000';

export const VECTOR_01_PAYLOAD_HEX = VECTOR_01_META_HEX + VECTOR_01_MAIN_HEX + VECTOR_01_AUX_HEX;

/** Meta section only, declaring no aux region and no explicit main offset. */
export const MINIMAL_NO_AUX_PAYLOAD_HEX =
  // meta: {} (empty map) -- main then starts at the next sequence item
  'a0' +
  // main: {9: 0 (PLA), 10: "Test"} as a definite map
  'a2' +
  '0900' +
  '0a6454657374';

/**
 * Main section carrying an unknown field key and an unknown tag ordinal, to
 * prove the spec's "skip what you don't understand" rule is honoured rather
 * than throwing.
 *
 *   meta a0                 -- {} empty map
 *   main a3                 -- map(3)
 *        09 00              -- material_type = 0 (PLA)
 *        181c 82 17 18c8    -- tags = [23 (glitter), 200 (unknown)]
 *        19270f 01          -- key 9999 (unknown) = 1
 */
export const UNKNOWN_KEYS_PAYLOAD_HEX = 'a0' + 'a3' + '0900' + '181c821718c8' + '19270f01';
