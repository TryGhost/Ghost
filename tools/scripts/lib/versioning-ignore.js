import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { ROOT_DIR } from './constants.js';

const WORKSPACE_MANIFEST_PATH = join(ROOT_DIR, 'pnpm-workspace.yaml');
// Comment heading the private-package block of `versioning.ignore`.
export const PRIVATE_BLOCK_MARKER = '# ignore private packages';

/**
 * Adds a package to the private-package block of `versioning.ignore`, keeping
 * the block sorted. Edits the text so the file's comments survive.
 *
 * @param {string} name - The package name.
 * @param {string} [manifestPath] - Path to pnpm-workspace.yaml.
 * @returns {Promise<boolean>} - false when the package was already listed.
 */
export async function addPrivatePackageToVersioningIgnore(
  name,
  manifestPath = WORKSPACE_MANIFEST_PATH,
) {
  const lines = (await readFile(manifestPath, 'utf8')).split('\n');
  const markerIndex = lines.findIndex((line) => line.trim().startsWith(PRIVATE_BLOCK_MARKER));
  if (markerIndex === -1) {
    throw new Error(`Could not find "${PRIVATE_BLOCK_MARKER}" in ${manifestPath}`);
  }

  let start = markerIndex + 1;
  while (lines[start]?.trim().startsWith('#')) {
    start += 1;
  }
  let end = start;
  while (/^\s+- /.test(lines[end] ?? '')) {
    end += 1;
  }

  const entry = `    - '${name}'`;
  const block = lines.slice(start, end);
  if (block.includes(entry)) {
    return false;
  }

  lines.splice(start, end - start, ...[...block, entry].sort());
  await writeFile(manifestPath, lines.join('\n'));
  return true;
}
