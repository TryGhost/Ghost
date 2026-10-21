// Decides whether a continuous package has anything new to publish by
// comparing what `pnpm pack` produces now against the tarball npm already has
// for the live version. The affected graph marks a package for dependency
// changes that may never reach its output (dev tooling, dedupes); this is the
// gate that turns "affected" into "changed".
//
// pnpm's pack output is byte-reproducible (fixed mtimes, sorted entries, one
// pinned pnpm), so the tarball's sha512 matching the registry's integrity
// record means identical content, with nothing downloaded. A pnpm upgrade that
// changes the gzip stream would cost one spurious patch publish per package,
// which is harmless.
//
// Usage: node compare-published.ts --version <live-version> [<package-dir>]
//   Prints the verdict and, when GITHUB_OUTPUT is set, appends
//   `changed=true|false` for the workflow. The package must already be built
//   with the live version written to package.json, so anything that bakes the
//   version into the bundle compares like for like.

import { createHash } from 'node:crypto';
import { appendFile, mkdtemp, readdir, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { $ } from 'execa';

import { readJson } from '../lib/utils.ts';

/** The SRI string npm records for a tarball, e.g. "sha512-…". */
export function integrityOf(bytes: Buffer): string {
  return `sha512-${createHash('sha512').update(bytes).digest('base64')}`;
}

export interface Comparison {
  changed: boolean;
  reason: string;
}

/** @param version - the live version to compare against */
export async function comparePublished(packageDir: string, version: string): Promise<Comparison> {
  const { name } = await readJson<{ name: string }>(join(packageDir, 'package.json'));
  const work = await mkdtemp(join(tmpdir(), 'compare-published-'));

  try {
    await $({ cwd: packageDir })`pnpm pack --pack-destination ${work}`;
    const tarballs = (await readdir(work)).filter((file) => file.endsWith('.tgz'));
    const [tarball] = tarballs;
    if (tarballs.length !== 1 || !tarball) {
      throw new Error(`Expected one tarball from pnpm pack, found ${tarballs.length}`);
    }
    const local = integrityOf(await readFile(join(work, tarball)));

    const { stdout } = await $`npm view ${name}@${version} dist.integrity`;
    const published = stdout.trim();
    if (!published) {
      throw new Error(`npm has no integrity record for ${name}@${version}`);
    }

    return local === published
      ? { changed: false, reason: `tarball matches ${name}@${version} (${published})` }
      : { changed: true, reason: `tarball differs from ${name}@${version}` };
  } finally {
    await rm(work, { recursive: true, force: true });
  }
}

async function main(): Promise<void> {
  const { values, positionals } = parseArgs({
    options: { version: { type: 'string' } },
    allowPositionals: true,
  });
  if (!values.version) {
    throw new Error('--version is required');
  }
  const packageDir = resolve(positionals[0] || process.cwd());

  const { changed, reason } = await comparePublished(packageDir, values.version);
  console.log(`${changed ? 'Changed' : 'Unchanged'}: ${reason}`);

  if (process.env.GITHUB_OUTPUT) {
    await appendFile(process.env.GITHUB_OUTPUT, `changed=${changed}\n`);
  }
}

if (import.meta.main) {
  try {
    await main();
  } catch (error) {
    console.error((error as Error).message);
    process.exit(1);
  }
}
