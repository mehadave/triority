// Tab-sized icons: the full app icon is a wide strip that turns to mush at 16-32px,
// so these use just its sunflower-with-tick on the same dark rounded tile.
import { writeFileSync } from 'node:fs';
import sharp from 'sharp';

const SRC = 'assets-src/triority_icon.png';
// Bounds of the sunflower inside the 1024px icon, with a little breathing room.
const FLOWER = { left: 607, top: 344, width: 348, height: 348 };
const TILE = '#1A1A1A';

async function favicon(size) {
  const radius = Math.round(size * 0.22);
  const tile = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><rect width="${size}" height="${size}" rx="${radius}" fill="${TILE}"/></svg>`,
  );
  const inner = Math.round(size * 0.9);
  const flower = await sharp(SRC).extract(FLOWER).resize(inner, inner).png().toBuffer();
  const offset = Math.round((size - inner) / 2);
  return sharp(tile)
    .composite([{ input: flower, left: offset, top: offset }])
    .png({ compressionLevel: 9 })
    .toBuffer();
}

// ICO container holding PNG images (supported by every current browser).
function ico(images) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);
  const entries = [];
  let offset = 6 + 16 * images.length;
  for (const { size, data } of images) {
    const e = Buffer.alloc(16);
    e.writeUInt8(size >= 256 ? 0 : size, 0);
    e.writeUInt8(size >= 256 ? 0 : size, 1);
    e.writeUInt16LE(1, 4);
    e.writeUInt16LE(32, 6);
    e.writeUInt32LE(data.length, 8);
    e.writeUInt32LE(offset, 12);
    offset += data.length;
    entries.push(e);
  }
  return Buffer.concat([header, ...entries, ...images.map((i) => i.data)]);
}

const sizes = [16, 32, 48];
const images = await Promise.all(sizes.map(async (size) => ({ size, data: await favicon(size) })));
writeFileSync('public/pwa-16x16.png', images[0].data);
writeFileSync('public/pwa-32x32.png', images[1].data);
writeFileSync('public/favicon.ico', ico(images));
console.log('favicons: 16, 32 and favicon.ico (16/32/48)');
