// Fails the build if the JavaScript needed for first load goes over budget.
import { readFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { join } from 'node:path';

const BUDGET_KB = 160;
const dist = 'dist';
const html = readFileSync(join(dist, 'index.html'), 'utf8');

const files = new Set();
for (const [, src] of html.matchAll(/<script[^>]+src="\/([^"]+\.js)"/g)) files.add(src);
for (const [, href] of html.matchAll(/<link[^>]+rel="modulepreload"[^>]+href="\/([^"]+\.js)"/g))
  files.add(href);

let total = 0;
for (const file of files) {
  const size = gzipSync(readFileSync(join(dist, file))).length;
  total += size;
  console.log(`  ${file}  ${(size / 1024).toFixed(1)} KB gz`);
}
const kb = total / 1024;
console.log(`First-load JS: ${kb.toFixed(1)} KB gzipped (budget ${BUDGET_KB} KB)`);
if (kb > BUDGET_KB) {
  console.error('Over the size budget.');
  process.exit(1);
}
