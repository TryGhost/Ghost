// Diffs two image reports written by ghost/core/scripts/prune.mts --report and
// renders the result as markdown for a CI step summary.
//
// The reports measure what actually ships: per-package byte and file counts of
// the pruned production node_modules. Image bytes alone hide this — gzip makes a
// duplicated 2.9k-file copy of viem look like a couple of megabytes — so the
// per-package view is what tells you *which* dependency moved the number.
//
// Runs on bare node in job_docker, which has no pnpm install: node builtins only.

import fs from 'node:fs/promises';
import { parseArgs } from 'node:util';

/**
 * @typedef {{files: number, bytes: number}} Stats
 * @typedef {{profile: string, total: Stats, packages: Record<string, Stats>}} Report
 */

const EMPTY = { files: 0, bytes: 0 };

/** Packages listed individually in the diff table. */
const TOP_N = 15;

/**
 * pnpm's virtual store directory name is `name@version` plus a `_`-separated
 * suffix for each peer it was resolved against. Two ids that share an identity
 * but differ in suffix are the same published tarball unpacked twice.
 *
 * Splitting on the first `_` is wrong — `string_decoder` and the `lodash._*`
 * family carry one in the name — so find the version separator first. A scoped
 * name is written `@scope+pkg`, which puts its own `@` in front of the version's.
 *
 * @param {string} id - a virtual store directory name, e.g. `viem@2.55.11_zod@3.25.76`
 * @returns {string}
 */
export function identityOf(id) {
  const versionAt = id.indexOf('@', id.startsWith('@') ? 1 : 0);
  if (versionAt === -1) {
    return id;
  }

  const suffixAt = id.indexOf('_', versionAt);
  return suffixAt === -1 ? id : id.slice(0, suffixAt);
}

const mib = (bytes) => `${(bytes / 1024 / 1024).toFixed(1)} MiB`;
const signed = (value, format) =>
  `${value > 0 ? '+' : value < 0 ? '−' : '±'}${format(Math.abs(value))}`;
const signedMib = (bytes) => signed(bytes, mib);
const signedCount = (count) => signed(count, String);

/**
 * Per-package deltas, largest absolute byte change first.
 *
 * @param {Report} current
 * @param {Report} baseline
 * @returns {Array<{id: string, bytes: number, files: number, status: 'added'|'removed'|'changed'}>}
 */
export function diffPackages(current, baseline) {
  const ids = new Set([...Object.keys(current.packages), ...Object.keys(baseline.packages)]);

  return [...ids]
    .map((id) => {
      const now = current.packages[id] ?? EMPTY;
      const before = baseline.packages[id] ?? EMPTY;
      const status = !(id in baseline.packages)
        ? 'added'
        : !(id in current.packages)
          ? 'removed'
          : 'changed';
      return { id, bytes: now.bytes - before.bytes, files: now.files - before.files, status };
    })
    .filter((entry) => entry.bytes !== 0 || entry.files !== 0)
    .sort((a, b) => Math.abs(b.bytes) - Math.abs(a.bytes));
}

/**
 * Packages unpacked more than once because a peer forked them. Reported for the
 * current build only — it is a standing property of the tree, not a delta.
 *
 * @param {Report} report
 * @returns {Array<{identity: string, instances: string[], bytes: number}>}
 */
export function duplicateInstances(report) {
  /** @type {Map<string, string[]>} */
  const byIdentity = new Map();
  for (const id of Object.keys(report.packages)) {
    if (id === '(app)') {
      continue;
    }
    const identity = identityOf(id);
    byIdentity.set(identity, [...(byIdentity.get(identity) ?? []), id]);
  }

  return [...byIdentity]
    .filter(([, instances]) => instances.length > 1)
    .map(([identity, instances]) => ({
      identity,
      instances: instances.sort(),
      // What deduplicating would save: everything past the first copy.
      bytes: instances
        .map((id) => report.packages[id].bytes)
        .sort((a, b) => b - a)
        .slice(1)
        .reduce((sum, bytes) => sum + bytes, 0),
    }))
    .sort((a, b) => b.bytes - a.bytes);
}

/**
 * @param {Report} current
 * @param {Report | null} baseline
 * @param {{baselineLabel?: string}} [options]
 * @returns {string}
 */
export function render(current, baseline, { baselineLabel = 'base' } = {}) {
  const lines = ['## Production dependency size', ''];

  if (baseline) {
    const bytes = current.total.bytes - baseline.total.bytes;
    const files = current.total.files - baseline.total.files;

    lines.push(
      `| | This build | \`${baselineLabel}\` | Delta |`,
      '|---|---|---|---|',
      `| Size | ${mib(current.total.bytes)} | ${mib(baseline.total.bytes)} | **${signedMib(bytes)}** |`,
      `| Files | ${current.total.files} | ${baseline.total.files} | **${signedCount(files)}** |`,
      '',
    );

    const changed = diffPackages(current, baseline);
    if (changed.length === 0) {
      lines.push('No package-level changes.', '');
    } else {
      lines.push(
        `### Changed packages (${changed.length})`,
        '',
        '| Package | Size | Files | |',
        '|---|---|---|---|',
      );
      for (const entry of changed.slice(0, TOP_N)) {
        const note = entry.status === 'changed' ? '' : entry.status;
        lines.push(
          `| \`${entry.id}\` | ${signedMib(entry.bytes)} | ${signedCount(entry.files)} | ${note} |`,
        );
      }
      if (changed.length > TOP_N) {
        lines.push(`| _… ${changed.length - TOP_N} more_ | | | |`);
      }
      lines.push('');
    }
  } else {
    lines.push(
      `No baseline report for \`${baselineLabel}\` — showing totals only.`,
      '',
      `**Size:** ${mib(current.total.bytes)} across ${current.total.files} files in ${Object.keys(current.packages).length} packages.`,
      '',
    );
  }

  const duplicates = duplicateInstances(current);
  if (duplicates.length > 0) {
    const wasted = duplicates.reduce((sum, entry) => sum + entry.bytes, 0);
    lines.push(
      `### Duplicated packages (${duplicates.length}, ${mib(wasted)} recoverable)`,
      '',
      'Same version unpacked more than once because a peer dependency forked it.',
      '',
      '| Package | Copies | Recoverable |',
      '|---|---|---|',
    );
    for (const entry of duplicates.slice(0, TOP_N)) {
      lines.push(`| \`${entry.identity}\` | ${entry.instances.length} | ${mib(entry.bytes)} |`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

const readReport = async (file) => {
  try {
    return JSON.parse(await fs.readFile(file, 'utf8'));
  } catch {
    return null;
  }
};

if (import.meta.main) {
  const { values } = parseArgs({
    options: {
      current: { type: 'string' },
      baseline: { type: 'string' },
      'baseline-label': { type: 'string' },
    },
  });

  if (!values.current) {
    console.error(
      'Usage: compare-image-report.js --current=<file> [--baseline=<file>] [--baseline-label=<text>]',
    );
    process.exit(1);
  }

  const current = await readReport(values.current);
  if (!current) {
    console.error(`Could not read image report: ${values.current}`);
    process.exit(1);
  }

  // A missing baseline is normal (first build on a branch, base commit never
  // pushed an image) and must not fail the build — render totals instead.
  const baseline = values.baseline ? await readReport(values.baseline) : null;

  console.log(render(current, baseline, { baselineLabel: values['baseline-label'] }));
}
