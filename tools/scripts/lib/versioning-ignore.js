import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { withPrivatePackageIgnored } from '@tryghost/dev-tools/versioning-ignore';
import { ROOT_DIR } from './constants.js';

export { PRIVATE_BLOCK_MARKER } from '@tryghost/dev-tools/versioning-ignore';

export async function addPrivatePackageToVersioningIgnore(
  name,
  manifestPath = join(ROOT_DIR, 'pnpm-workspace.yaml'),
) {
  const text = await readFile(manifestPath, 'utf8');
  const updated = withPrivatePackageIgnored(text, name);
  if (updated === text) {
    return false;
  }
  await writeFile(manifestPath, updated);
  return true;
}
