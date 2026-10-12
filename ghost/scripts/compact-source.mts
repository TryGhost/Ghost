#!/usr/bin/env node

/**
 * compact-source.mts - Minify the dependency JavaScript in a built Ghost tree so
 * its source costs less heap.
 *
 * V8 keeps every loaded script's source on the heap for the life of the
 * process (lazy compilation and Function.prototype.toString read it), and
 * stores it at two bytes per character when the file holds any character
 * above U+00FF. Every .js/.cjs/.mjs file under node_modules goes through
 * esbuild's whitespace and comment removal with ASCII output: identifiers are
 * not renamed, legal comments are kept, and with --maps a source map is written
 * per file. A file is replaced only when the result is smaller on the heap;
 * one esbuild cannot parse is left as it was.
 *
 * Ghost's own code (core/) is not touched, so its stack frames keep their line
 * numbers; the local-source/latin1-only lint rule keeps it at one byte per
 * character instead.
 *
 * Dockerfile.production's deploy stage runs it against /home/ghost after
 * prune.mts. Unlike prune.mts it needs esbuild (a ghost devDependency), so it
 * does not ship in the release tarballs.
 *
 *   node scripts/compact-source.mts /home/ghost [--maps=<dir>] [--dry-run]
 */

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

/** Minify one file's source. Pure; `sourcefile` only names the source map's source. */
export function compactFile(source: string, sourcefile: string): Outcome {
  let result;
  try {
    result = transformSync(source, {
      loader: 'js',
      minifyWhitespace: true,
      legalComments: 'inline',
      charset: 'ascii',
      sourcemap: 'external',
      sourcefile,
      logLevel: 'silent',
    });
  } catch {
    return { status: 'unchanged', reason: 'unparseable' };
  }
  const before = heapCost(source);
  const after = heapCost(result.code);
  if (after >= before) {
    return { status: 'unchanged', reason: 'not smaller' };
  }
  return { status: 'changed', code: result.code, map: result.map, before, after };
}

/**
 * Walk `dir` and yield every script, as a path relative to `root`. Symlinks are
 * never followed: pnpm's virtual store is full of them, and each target is
 * reached once via .pnpm anyway.
 */
async function* scripts(root: string, rel: string): AsyncGenerator<string> {
  let entries;
  try {
    entries = await fs.readdir(path.join(root, rel), { withFileTypes: true });
  } catch {
    return;
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

export interface CompactResult {
  files: number;
  changed: number;
  /** Heap cost of the changed files' source, before and after. */
  before: number;
  after: number;
  unparseable: string[];
}

export async function compactSource(
  target: string,
  { maps, dryRun = false }: { maps?: string; dryRun?: boolean } = {},
): Promise<CompactResult> {
  const result: CompactResult = { files: 0, changed: 0, before: 0, after: 0, unparseable: [] };
  if (maps && !dryRun) {
    await fs.mkdir(maps, { recursive: true });
  }

  for await (const rel of scripts(target, 'node_modules')) {
    result.files += 1;
    const absolute = path.join(target, rel);
    const outcome = compactFile(await fs.readFile(absolute, 'utf8'), rel);
    if (outcome.status === 'unchanged') {
      if (outcome.reason === 'unparseable') {
        result.unparseable.push(rel);
      }
      continue;
    }

    result.changed += 1;
    result.before += outcome.before;
    result.after += outcome.after;
    if (dryRun) {
      continue;
    }
    // Replace the file rather than modifying an inode shared with pnpm's store.
    const { mode } = await fs.stat(absolute);
    await fs.writeFile(`${absolute}.compact`, outcome.code, { mode, flag: 'wx' });
    await fs.rename(`${absolute}.compact`, absolute);
    if (maps) {
      const mapFile = path.join(maps, `${rel}.map`);
      await fs.mkdir(path.dirname(mapFile), { recursive: true });
      await fs.writeFile(mapFile, outcome.map);
    }
  }
  return result;
}

const mib = (value: number): string => `${(value / 1024 / 1024).toFixed(1)} MiB`;

/** Print a summary. Callers embed this in their own build output. */
export function reportCompact(result: CompactResult, { dryRun = false } = {}): void {
  console.log(
    `  ${dryRun ? 'would minify' : 'minified'} ${result.changed} of ${result.files} scripts: heap cost of their source ${mib(result.before)} -> ${mib(result.after)}`,
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
      maps: { type: 'string' },
      'dry-run': { type: 'boolean', default: false },
    },
  });

  const [target] = positionals;
  if (!target) {
    console.error('Usage: compact-source.mts <target-dir> [--maps=<dir>] [--dry-run]');
    process.exit(1);
  }

  console.log(`Minifying dependency source in ${target}`);
  const result = await compactSource(path.resolve(target), {
    maps: values.maps,
    dryRun: values['dry-run'],
  });
  reportCompact(result, { dryRun: values['dry-run'] });
}
