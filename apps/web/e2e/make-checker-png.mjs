// Generates a small deterministic checkerboard PNG, used by e2e scripts to
// exercise the skin-texture upload flow (Playwright's setInputFiles needs a
// real file on disk). Hand-rolled PNG encoder using only Node's builtin
// zlib — no image library dependency, so it needs no extra install and
// produces the exact same bytes on every run.
// Usage: node apps/web/e2e/make-checker-png.mjs [outPath] [size] [cell]
import { writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

let crcTable;
function crc32(buf) {
  if (!crcTable) {
    crcTable = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      crcTable[n] = c >>> 0;
    }
  }
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeData = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(typeData), 0);
  return Buffer.concat([len, typeData, crc]);
}

/** Builds a raw (uncompressed, RGB8, no-filter) checkerboard PNG. */
export function makeCheckerPng({
  size = 64,
  cell = 8,
  colorA = [230, 50, 50],
  colorB = [40, 90, 230],
} = {}) {
  const stride = size * 3 + 1; // +1 filter-type byte per scanline
  const raw = Buffer.alloc(stride * size);
  for (let y = 0; y < size; y++) {
    let offset = y * stride;
    raw[offset++] = 0; // filter: none
    for (let x = 0; x < size; x++) {
      const isA = (Math.floor(x / cell) + Math.floor(y / cell)) % 2 === 0;
      const [r, g, b] = isA ? colorA : colorB;
      raw[offset++] = r;
      raw[offset++] = g;
      raw[offset++] = b;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // color type: truecolor (RGB)
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const idat = deflateSync(raw);
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))]);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const out = process.argv[2] ?? '/tmp/checker-test.png';
  const size = Number(process.argv[3] ?? 64);
  const cell = Number(process.argv[4] ?? 8);
  writeFileSync(out, makeCheckerPng({ size, cell }));
  console.log(`wrote ${out}`);
}
