#!/usr/bin/env node

/**
 * compact-source.mts - Minify the JavaScript in a built Ghost tree so its source
 * costs less heap.
 *
 * V8 keeps every loaded script's source on the heap for the life of the
 * process (lazy compilation and Function.prototype.toString read it), and
 * stores it at two bytes per character when the file holds any character
 * above U+00FF. Every .js/.cjs/.mjs file under node_modules and core goes through
 * esbuild's whitespace and comment removal with ASCII output: identifiers are
 * not renamed and legal comments are kept. A file is replaced only when the
 * result is smaller on the heap; one esbuild cannot parse is left as it was.
 *
 * Each minified file gets a source map holding positions only, not a copy of
 * the original source, which would more than double the size of node_modules.
 * The maps live in their own tree (`sourcemaps/<path>.map` under the target),
 * not next to the code: loaders that require every file in a directory, like
 * knex-migrator's, would otherwise try to run them. Each file links its map by
 * a relative sourceMappingURL. They cost nothing at runtime;
 * `node --enable-source-maps` maps stack frames back to their original lines.
 *
 * Code Ghost serves to browsers (core/built, core/frontend/public and
 * core/frontend/src) is left alone.
 *
 * Dockerfile.production's deploy stage runs it against /home/ghost after
 * prune.mts. Unlike prune.mts it needs esbuild (a ghost devDependency), so it
 * does not ship in the release tarballs.
 *
 *   node scripts/compact-source.mts /home/ghost [--dry-run]
 */

import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { transformSync } from 'esbuild';

// Any UTF-16 code unit above U+00FF. Built from a string because formatters
// rewrite \u escapes in regular expression literals into the characters.
const ABOVE_LATIN1 = new RegExp('[\\u0100-\\uffff]');

/** Heap cost of a string in V8: one byte per character in Latin-1, else two. */
export function heapCost(source: string): number {
  return (ABOVE_LATIN1.test(source) ? 2 : 1) * source.length;
}

export type Outcome =
  | { status: 'unchanged'; reason: 'unparseable' | 'not smaller' }
  | { status: 'changed'; code: string; map: string; before: number; after: number };

// Where the maps go, relative to the target.
export const MAPS_DIR = 'sourcemaps';

/**
 * Minify one file's source. Pure. `sourceFile` is how the map names the
 * original source (the file's path relative to the map, so a mapped stack
 * frame keeps the path it has today) and `mapUrl` is how the code links its
 * map (the map's path relative to the file).
 */
export function compactFile(source: string, sourceFile: string, mapUrl: string): Outcome {
  let result;
  try {
    result = transformSync(source, {
      loader: 'js',
      minifyWhitespace: true,
      legalComments: 'inline',
      charset: 'ascii',
      sourcemap: 'external',
      sourcesContent: false,
      sourcefile: sourceFile,
      logLevel: 'silent',
    });
  } catch {
    return { status: 'unchanged', reason: 'unparseable' };
  }
  const code = `${result.code}//# sourceMappingURL=${mapUrl}\n`;
  const before = heapCost(source);
  const after = heapCost(code);
  if (after >= before) {
    return { status: 'unchanged', reason: 'not smaller' };
  }
  return { status: 'changed', code, map: result.map, before, after };
}

// The trees minified, relative to the target, and the code under them that
// Ghost serves to browsers rather than loads.
const DIRS = ['node_modules', 'core'];
const BROWSER_CODE = ['core/built', 'core/frontend/public', 'core/frontend/src'];

/**
 * Walk `dir` and yield every script, as a path relative to `root`. Symlinks are
 * never followed: pnpm's virtual store is full of them, and each target is
 * reached once via .pnpm anyway.
 */
async function* scripts(root: string, rel: string): AsyncGenerator<string> {
  if (BROWSER_CODE.some((dir) => rel === dir || rel.startsWith(`${dir}/`))) {
    return;
  }
  let entries;
  try {
    entries = await fs.readdir(path.join(root, rel), { withFileTypes: true });
  } catch (error) {
    // A missing directory has nothing to minify; anything else is a
    // broken tree, and the build should stop rather than ship it half-done.
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return;
    }
    throw error;
  }
  for (const entry of entries) {
    const child = `${rel}/${entry.name}`;
    if (entry.isDirectory()) {
      yield* scripts(root, child);
    } else if (entry.isFile() && /\.[cm]?js$/.test(entry.name)) {
      yield child;
    }
  }
}

/**
 * Write `content` to `file` by renaming a new file over it, never through an
 * inode shared with pnpm's store. The temporary name is unique so an
 * interrupted run can't leave one behind that a later run collides with.
 */
async function replaceFile(file: string, content: string, mode?: number): Promise<void> {
  const temporary = `${file}.${randomUUID()}.compact`;
  try {
    await fs.writeFile(temporary, content, { mode, flag: 'wx' });
    await fs.rename(temporary, file);
  } finally {
    await fs.rm(temporary, { force: true });
  }
}

export interface CompactResult {
  files: number;
  changed: number;
  /** Heap cost of the changed files' source, before and after. */
  before: number;
  after: number;
  /** Bytes of source maps written next to the changed files. */
  mapBytes: number;
  unparseable: string[];
}

export async function compactSource(
  target: string,
  { dryRun = false }: { dryRun?: boolean } = {},
): Promise<CompactResult> {
  const result: CompactResult = {
    files: 0,
    changed: 0,
    before: 0,
    after: 0,
    mapBytes: 0,
    unparseable: [],
  };

  for (const dir of DIRS) {
    for await (const rel of scripts(target, dir)) {
      result.files += 1;
      const absolute = path.join(target, rel);
      const mapFile = path.join(target, MAPS_DIR, `${rel}.map`);
      const outcome = compactFile(
        await fs.readFile(absolute, 'utf8'),
        path.relative(path.dirname(mapFile), absolute),
        path.relative(path.dirname(absolute), mapFile),
      );
      if (outcome.status === 'unchanged') {
        if (outcome.reason === 'unparseable') {
          result.unparseable.push(rel);
        }
        continue;
      }

      result.changed += 1;
      result.before += outcome.before;
      result.after += outcome.after;
      result.mapBytes += Buffer.byteLength(outcome.map);
      if (dryRun) {
        continue;
      }
      const { mode } = await fs.stat(absolute);
      await replaceFile(absolute, outcome.code, mode);
      await fs.mkdir(path.dirname(mapFile), { recursive: true });
      await replaceFile(mapFile, outcome.map);
    }
  }
  return result;
}

const mib = (value: number): string => `${(value / 1024 / 1024).toFixed(1)} MiB`;

/** Print a summary. Callers embed this in their own build output. */
export function reportCompact(result: CompactResult, { dryRun = false } = {}): void {
  console.log(
    `  ${dryRun ? 'would minify' : 'minified'} ${result.changed} of ${result.files} scripts: heap cost of their source ${mib(result.before)} -> ${mib(result.after)}, plus ${mib(result.mapBytes)} of source maps`,
  );
  if (result.unparseable.length) {
    console.log(`  left as they were (esbuild cannot parse them): ${result.unparseable.length}`);
    for (const file of result.unparseable.slice(0, 10)) {
      console.log(`    ${file}`);
    }
  }
}

if (import.meta.main) {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      'dry-run': { type: 'boolean', default: false },
    },
  });

  const [target] = positionals;
  if (!target) {
    console.error('Usage: compact-source.mts <target-dir> [--dry-run]');
    process.exit(1);
  }

  console.log(`Minifying source in ${target}`);
  const result = await compactSource(path.resolve(target), { dryRun: values['dry-run'] });
  reportCompact(result, { dryRun: values['dry-run'] });
}
