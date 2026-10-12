import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { assembleAdminAssets } from './lib/admin-assets.ts';

// Node can run TypeScript directly on both supported Node lines.
assembleAdminAssets(resolve(fileURLToPath(new URL('..', import.meta.url))));
