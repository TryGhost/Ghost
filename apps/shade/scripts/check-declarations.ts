/// <reference types="node" />
/* eslint-disable no-console -- this is a CLI script; stdout is the UI */

/**
 * Fails the build when a generated declaration imports a module that the
 * installed package won't contain.
 *
 * tsc copies relative specifiers into the .d.ts output verbatim and doesn't
 * emit Shade's ambient typings, so a type that leaks an asset import such as
 * `./logo.svg?react` leaves consumers with TS2307, or with an `any` export
 * under skipLibCheck.
 */

import { existsSync } from 'node:fs';
import { readdir, readFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';

const RELATIVE_SPECIFIER = /\b(?:from|import\()\s*['"](\.{1,2}\/[^'"]+)['"]/g;

function resolvesToDeclaration(fromFile: string, specifier: string): boolean {
  // Query suffixes are bundler-only; TypeScript can't resolve them to a file.
  if (specifier.includes('?')) {
    return false;
  }
  const target = resolve(dirname(fromFile), specifier);
  const base = target.replace(/\.(?:[cm]?js|jsx|tsx?)$/, '');
  return existsSync(`${base}.d.ts`) || existsSync(join(target, 'index.d.ts'));
}

/** Every relative import in `typesDir` that doesn't resolve to a declaration there. */
export async function findUnresolvedImports(typesDir: string): Promise<string[]> {
  const files = (await readdir(typesDir, { recursive: true }))
    .filter((file) => file.endsWith('.d.ts'))
    .sort();
  const unresolved: string[] = [];

  for (const file of files) {
    const path = join(typesDir, file);
    const source = await readFile(path, 'utf8');
    for (const [, specifier] of source.matchAll(RELATIVE_SPECIFIER)) {
      if (specifier && !resolvesToDeclaration(path, specifier)) {
        unresolved.push(`${file} imports ${specifier}`);
      }
    }
  }

  return unresolved;
}

if (import.meta.main) {
  const unresolved = await findUnresolvedImports(join(import.meta.dirname, '..', 'types'));
  if (unresolved.length > 0) {
    console.error(
      `Generated declarations import modules the published package won't contain:\n\n${unresolved.join('\n')}\n\nGive the exported value an explicit type so its declaration doesn't reference the source module.`,
    );
    process.exit(1);
  }
}
