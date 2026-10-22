// Trims Caveat Brush (titles only) down to the characters the app actually uses.
import { readFileSync, writeFileSync } from 'node:fs';
import subsetFont from 'subset-font';

const SRC = 'node_modules/@fontsource/caveat-brush/files/caveat-brush-latin-400-normal.woff2';
const OUT = 'src/assets/fonts/caveat-brush-subset.woff2';

let text = '';
for (let c = 0x20; c <= 0x7e; c++) text += String.fromCharCode(c);
text += '‘’“”–—…';

const input = readFileSync(SRC);
const output = await subsetFont(input, text, { targetFormat: 'woff2' });
writeFileSync(OUT, output);
console.log(`Caveat Brush: ${(input.length / 1024).toFixed(1)} KB -> ${(output.length / 1024).toFixed(1)} KB`);
