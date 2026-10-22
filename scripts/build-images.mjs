// Exports the hero sunflower as AVIF and WebP at the sizes the app's srcset asks for.
import { existsSync, mkdirSync } from 'node:fs';
import sharp from 'sharp';

const SRC = 'assets-src/sunflower_crochet_hd.png';
const OUT = 'public/img';
const WIDTHS = [256, 512, 1024];

if (!existsSync(SRC)) {
  console.error(`Missing ${SRC}`);
  process.exit(1);
}
mkdirSync(OUT, { recursive: true });

for (const width of WIDTHS) {
  const base = sharp(SRC).resize({
    width,
    height: width,
    fit: 'contain',
    background: { r: 0, g: 0, b: 0, alpha: 0 },
  });
  await base.clone().avif({ quality: 52, effort: 7 }).toFile(`${OUT}/sunflower-${width}.avif`);
  await base
    .clone()
    .webp({ quality: 78, effort: 6, alphaQuality: 90 })
    .toFile(`${OUT}/sunflower-${width}.webp`);
  console.log(`sunflower-${width}: done`);
}
