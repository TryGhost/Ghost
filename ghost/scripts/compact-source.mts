#!/usr/bin/env node

/**
 * compact-source.mts — Rewrite the JavaScript a built Ghost tree loads so its
 * source costs less heap.
 *
 * V8 keeps every loaded script's source on the heap for the life of the
 * process (lazy compilation and Function.prototype.toString read it), and
 * stores it at two bytes per character when the file holds any character
 * above U+00FF: one em dash in a comment doubles the whole file. Ghost loads
 * about 22 MB of source at boot. Modes:
 *
 *   escape  rewrite only characters above U+00FF as \u escapes. Every line
 *           stays where it was (columns move only on lines holding an escaped
 *           character), so stack traces still point at the right line.
 *   minify  esbuild whitespace and comment removal with ASCII output. Names
 *           and legal comments are kept; with --maps, a source map per file.
 *   hybrid  minify, except under the --keep-lines directories (core by
 *           default), which are only escaped: Ghost's own stack frames keep
 *           their line numbers, dependencies are minified.
 *   none    do nothing.
 *
 * A rewrite is kept only when esbuild prints the original and the rewrite
 * identically (comments and whitespace aside) and it is cheaper on the heap;
 * anything else is left as it was and reported.
 *
 * Dockerfile.production's deploy stage runs it against /home/ghost after
 * prune.mts. Unlike prune.mts it needs esbuild (a ghost devDependency), so it
 * does not ship in the release tarballs.
 *
 *   node scripts/compact-source.mts /home/ghost --mode=hybrid [--maps=<dir>]
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { transformSync } from 'esbuild';

export type Mode = 'none' | 'escape' | 'minify';
export type CliMode = Mode | 'hybrid';

export const MODES: CliMode[] = ['none', 'escape', 'minify', 'hybrid'];

// Any UTF-16 code unit above U+00FF, surrogate halves included.
const NON_LATIN1 = /[Ā-￿]/;
const SCRIPT = /\.[cm]?js$/;

// A template literal straight after an expression: a tagged template, whose tag
// can read the raw text (String.raw). Matched in esbuild's minified output.
const TAGGED_TEMPLATE = /[\w$)\]]`/;

// Defaults for /home/ghost: the server's code and its dependencies, minus what
// Ghost only serves to browsers.
export const DEFAULT_DIRS = ['node_modules', 'core'];
export const DEFAULT_EXCLUDE = ['core/built', 'core/frontend/public', 'core/frontend/src'];
export const DEFAULT_KEEP_LINES = ['core'];

/** Heap cost of a string in V8: one byte per character in Latin-1, else two. */
export function heapCost(source: string): number {
  return (NON_LATIN1.test(source) ? 2 : 1) * source.length;
}

const hex = (code: number): string => `\\u${code.toString(16).toUpperCase().padStart(4, '0')}`;

/**
 * Escape every character above U+00FF in place. Valid wherever such a character
 * can appear in JavaScript (strings, templates, regular expressions,
 * identifiers, comments) with two exceptions that the equivalence check in
 * compactFile catches: Unicode whitespace or line terminators in code, and
 * tagged templates that read their raw text. An identity escape (a backslash
 * before the character) becomes the plain \u escape, since a backslash before
 * a character that needs no escaping is ignored.
 */
export function escapeNonLatin1(source: string): string {
  // Node strips a byte order mark anyway; escaped it would be a syntax error.
  const text = source.charCodeAt(0) === 0xfeff ? source.slice(1) : source;
  let out = '';
  let start = 0;
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    if (code <= 0xff) {
      continue;
    }
    let end = i;
    let slashes = 0;
    while (end - slashes - 1 >= start && text.charCodeAt(end - slashes - 1) === 0x5c) {
      slashes++;
    }
    if (slashes % 2 === 1) {
      end--;
    }
    // Surrogate halves are escaped one at a time, which is what a pair means.
    out += text.slice(start, end) + hex(code);
    start = i + 1;
  }
  return out + text.slice(start);
}

/**
 * What esbuild prints for a file with comments and whitespace removed: two
 * sources that print the same are the same program. esbuild's ASCII output
 * escapes everything except regular expression literals and the raw text of
 * tagged templates. With no tagged template, what is left can only be in
 * regular expressions, and is escaped here: inside a regular expression \uXXXX
 * matches what the character did, with or without the u flag (surrogate pairs
 * included). Otherwise it is compared as printed, so an escape that changes a
 * raw template is caught.
 */
function canonical(source: string): string {
  const { code } = transformSync(source, {
    loader: 'js',
    minifyWhitespace: true,
    legalComments: 'none',
    charset: 'ascii',
    logLevel: 'silent',
  });
  return NON_LATIN1.test(code) && !TAGGED_TEMPLATE.test(code) ? escapeNonLatin1(code) : code;
}

export type Outcome =
  | { status: 'unchanged' }
  | { status: 'skipped'; reason: string }
  | { status: 'changed'; code: string; map: string | undefined; before: number; after: number };

/** Rewrite one file's source. Pure; `sourcefile` only names the source map's source. */
export function compactFile(source: string, mode: Mode, sourcefile: string): Outcome {
  if (mode === 'none' || (mode === 'escape' && !NON_LATIN1.test(source))) {
    return { status: 'unchanged' };
  }

  let reference: string;
  try {
    reference = canonical(source);
  } catch {
    return { status: 'skipped', reason: 'esbuild cannot parse it' };
  }

  // Escaping comes first in both modes: esbuild's ASCII output leaves regular
  // expressions alone, and minifying the escaped source keeps the source map's
  // lines those of the original.
  let input = source;
  if (NON_LATIN1.test(source)) {
    const escaped = escapeNonLatin1(source);
    let equivalent = false;
    try {
      equivalent = canonical(escaped) === reference;
    } catch {
      // the escape broke the syntax (Unicode whitespace in code)
    }
    if (equivalent) {
      input = escaped;
    } else if (mode === 'escape') {
      return { status: 'skipped', reason: 'escaping changes the program' };
    }
  }

  let code = input;
  let map: string | undefined;
  if (mode === 'minify') {
    try {
      const result = transformSync(input, {
        loader: 'js',
        minifyWhitespace: true,
        legalComments: 'inline',
        charset: 'ascii',
        sourcemap: 'external',
        sourcefile,
        logLevel: 'silent',
      });
      if (canonical(result.code) !== reference) {
        return { status: 'skipped', reason: 'minified output is not equivalent' };
      }
      code = result.code;
      map = result.map;
    } catch {
      return { status: 'skipped', reason: 'esbuild cannot minify it' };
    }
  }

  const before = heapCost(source);
  const after = heapCost(code);
  if (after >= before) {
    return { status: 'skipped', reason: 'not smaller on the heap' };
  }
  return { status: 'changed', code, map, before, after };
}

/**
 * Walk `dir` and yield every regular file, as a path relative to `root`.
 * Symlinks are never followed: pnpm's virtual store is full of them, and each
 * target is reached once via .pnpm anyway.
 */
async function* walk(root: string, rel: string, exclude: string[]): AsyncGenerator<string> {
  if (exclude.some((e) => rel === e || rel.startsWith(`${e}/`))) {
    return;
  }
  let entries;
  try {
    entries = await fs.readdir(path.join(root, rel), { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    const child = `${rel}/${entry.name}`;
    if (entry.isDirectory()) {
      yield* walk(root, child, exclude);
    } else if (entry.isFile() && SCRIPT.test(entry.name)) {
      yield child;
    }
  }
}

export interface CompactResult {
  mode: CliMode;
  files: number;
  changed: number;
  /** Heap cost of the changed files' source, before and after. */
  before: number;
  after: number;
  /** Files still holding characters above U+00FF. */
  remaining: number;
  skipped: Record<string, string[]>;
}

export async function compactSource(
  target: string,
  {
    mode,
    dirs = DEFAULT_DIRS,
    exclude = DEFAULT_EXCLUDE,
    keepLines = DEFAULT_KEEP_LINES,
    maps,
    dryRun = false,
  }: {
    mode: CliMode;
    dirs?: string[];
    exclude?: string[];
    keepLines?: string[];
    maps?: string;
    dryRun?: boolean;
  },
): Promise<CompactResult> {
  if (!MODES.includes(mode)) {
    throw new Error(`Unknown mode "${mode}" (expected one of: ${MODES.join(', ')})`);
  }
  const result: CompactResult = {
    mode,
    files: 0,
    changed: 0,
    before: 0,
    after: 0,
    remaining: 0,
    skipped: {},
  };
  if (maps && !dryRun) {
    await fs.mkdir(maps, { recursive: true });
  }
  if (mode === 'none') {
    return result;
  }

  const modeFor = (rel: string): Mode =>
    mode !== 'hybrid'
      ? mode
      : keepLines.some((dir) => rel === dir || rel.startsWith(`${dir}/`))
        ? 'escape'
        : 'minify';

  for (const dir of dirs) {
    for await (const rel of walk(target, dir, exclude)) {
      result.files += 1;
      const absolute = path.join(target, rel);
      const source = await fs.readFile(absolute, 'utf8');
      const outcome = compactFile(source, modeFor(rel), rel);

      if (outcome.status !== 'changed') {
        if (outcome.status === 'skipped') {
          (result.skipped[outcome.reason] ??= []).push(rel);
        }
        if (NON_LATIN1.test(source)) {
          result.remaining += 1;
        }
        continue;
      }

      result.changed += 1;
      result.before += outcome.before;
      result.after += outcome.after;
      if (NON_LATIN1.test(outcome.code)) {
        result.remaining += 1;
      }
      if (dryRun) {
        continue;
      }
      // Replace the file rather than modifying an inode shared with pnpm's store.
      const { mode: fileMode } = await fs.stat(absolute);
      await fs.writeFile(`${absolute}.compact`, outcome.code, { mode: fileMode, flag: 'wx' });
      await fs.rename(`${absolute}.compact`, absolute);
      if (maps && outcome.map) {
        const mapFile = path.join(maps, `${rel}.map`);
        await fs.mkdir(path.dirname(mapFile), { recursive: true });
        await fs.writeFile(mapFile, outcome.map);
      }
    }
  }
  return result;
}

const mib = (value: number): string => `${(value / 1024 / 1024).toFixed(1)} MiB`;

/** Print a summary. Callers embed this in their own build output. */
export function reportCompact(result: CompactResult, { dryRun = false } = {}): void {
  console.log(
    `  ${dryRun ? 'would rewrite' : 'rewrote'} ${result.changed} of ${result.files} scripts: heap cost of their source ${mib(result.before)} -> ${mib(result.after)}`,
  );
  console.log(`  still holding characters above U+00FF: ${result.remaining}`);
  for (const [reason, files] of Object.entries(result.skipped)) {
    console.log(`  left as they were (${reason}): ${files.length}`);
    for (const file of files.slice(0, 10)) {
      console.log(`    ${file}`);
    }
  }
}

if (import.meta.main) {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      mode: { type: 'string' },
      'keep-lines': { type: 'string', multiple: true },
      maps: { type: 'string' },
      'dry-run': { type: 'boolean', default: false },
    },
  });

  const [target] = positionals;
  const mode = values.mode as CliMode | undefined;
  if (!target || !mode) {
    console.error(
      'Usage: compact-source.mts <target-dir> --mode=<escape|minify|hybrid|none> [--keep-lines=<dir>]... [--maps=<dir>] [--dry-run]',
    );
    process.exit(1);
  }

  console.log(`Compacting source in ${target} (mode: ${mode})`);
  const result = await compactSource(path.resolve(target), {
    mode,
    keepLines: values['keep-lines'] ?? DEFAULT_KEEP_LINES,
    maps: values.maps,
    dryRun: values['dry-run'],
  });
  reportCompact(result, { dryRun: values['dry-run'] });
}
