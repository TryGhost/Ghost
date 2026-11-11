import { execFile } from 'node:child_process';
import { mkdtemp, realpath, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';

import {
  parseJsonText,
  readSignedManifest,
  verifySignedManifest,
} from '@tryghost/app-contracts/identity';
import { parseManifest } from '@tryghost/app-contracts/manifest';

export const SOURCE = {
  id: 'com.example.hello',
  name: 'Hello',
  description: 'Says hello.',
  author: { name: 'Example', url: 'https://example.com' },
  accent_color: '#ff5500',
  icon: { name: 'hand' },
  surfaces: [{ type: 'admin_page', url: '/' }],
};

/** A project of its own, outside any repository, with a `ghost-app.json`. */
export async function makeProject(files: Record<string, string> = {}): Promise<{
  root: string;
  cleanup: () => Promise<void>;
}> {
  // Resolved, as macOS keeps the temporary directory behind a symlink, which Vite resolves.
  const root = await realpath(await mkdtemp(join(tmpdir(), 'app-sdk-project-')));
  await writeFile(join(root, 'ghost-app.json'), JSON.stringify(SOURCE, null, 2));
  for (const [file, text] of Object.entries(files)) {
    await writeFile(join(root, file), text);
  }
  return { root, cleanup: () => rm(root, { recursive: true, force: true }) };
}

export const git = (cwd: string, ...args: string[]) => promisify(execFile)('git', args, { cwd });

/**
 * Reads a signed manifest as Ghost does: reads it unverified, parses the manifest against the
 * address it was fetched from, then verifies it with the identity key it names. Throws on any
 * step Ghost would refuse.
 */
export async function readAsGhost(body: unknown, manifestUrl: string) {
  const read = readSignedManifest(body);
  if (!read.success) {
    throw new Error(read.error);
  }
  const parsed = parseManifest(parseJsonText(read.payload), {
    manifestUrl,
    ghostUrls: ['http://localhost:2368'],
    allowLocalhost: true,
  });
  if (!parsed.success) {
    throw new Error(JSON.stringify(parsed.errors));
  }
  const verified = await verifySignedManifest(read.signed, parsed.manifest.identity_key);
  if (!verified.success) {
    throw new Error(verified.error);
  }
  return parsed.manifest;
}
