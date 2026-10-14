import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { build } from 'vite';
import type { TestProject } from 'vitest/node';

declare module 'vitest' {
  export interface ProvidedContext {
    /** Where the package and the browser bundle were built from the source under test. */
    built: { package: string; bundle: string };
  }
}

const root = fileURLToPath(new URL('..', import.meta.url));

/**
 * Builds the package and the browser bundle afresh, into a directory of their own, so the
 * bundle tests read what the source builds to now rather than whatever was last built.
 */
export default async function setup(project: TestProject) {
  const directory = await mkdtemp(join(tmpdir(), 'app-sdk-'));
  const built = { package: join(directory, 'build'), bundle: join(directory, 'dist') };
  for (const [mode, outDir] of [
    ['production', built.package],
    ['bundle', built.bundle],
  ] as const) {
    await build({ root, mode, logLevel: 'warn', build: { outDir } });
  }
  project.provide('built', built);
  return () => rm(directory, { recursive: true, force: true });
}
