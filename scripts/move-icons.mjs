// The generator writes next to the source image; the app serves icons from public/.
import { readdirSync, renameSync } from 'node:fs';
import { join } from 'node:path';

const from = 'assets-src';
const generated = /^(pwa-|maskable-|apple-touch-|favicon)/;
for (const file of readdirSync(from)) {
  if (generated.test(file)) renameSync(join(from, file), join('public', file));
}
