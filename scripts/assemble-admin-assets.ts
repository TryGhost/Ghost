import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { assembleAdminAssets } from './lib/admin-assets.ts';

const { values } = parseArgs({
  options: { 'without-ember': { type: 'boolean', default: false } },
});

// Node can run TypeScript directly on both supported Node lines.
assembleAdminAssets(resolve(fileURLToPath(new URL('..', import.meta.url))), {
  editorUrl: process.env.EDITOR_URL,
  includeEmber: !values['without-ember'],
});
