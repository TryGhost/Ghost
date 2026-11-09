import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseArgs } from 'node:util';

import type { JSONReport, JSONReportSuite } from '@playwright/test/reporter';

// Splits the browser e2e suite across CI shards by recorded file duration
// instead of Playwright's test-count `--shard`. `record` runs on main and
// folds each run's JSON reports into a timings file kept in the Actions cache;
// `plan` runs in every shard and picks that shard's files.

/**
 * Recorded seconds per test file, keyed by path relative to e2e/, with the
 * test count they were measured over so a split or grown file rescales.
 */
export type Timings = Record<string, { seconds: number; tests: number }>;

/**
 * Keyed by the test file Playwright loads. `definedIn` holds any other files
 * whose `test()` calls register tests in it (shared helpers): --test-list
 * matches those by where `test()` ran, so the plan has to name them too.
 */
type FileSummary = { tests: number; seconds: number; definedIn: Set<string> };

// Used for files with no recorded time when there's nothing to derive a rate from.
const DEFAULT_SECONDS_PER_TEST = 10;

/** Test count and duration (final attempt of each test) per loaded file for one project. */
export function summarizeReport(report: JSONReport, project: string): Map<string, FileSummary> {
  const files = new Map<string, FileSummary>();
  for (const fileSuite of report.suites) {
    const visit = (suite: JSONReportSuite) => {
      for (const spec of suite.specs) {
        for (const test of spec.tests) {
          if (test.projectName !== project) {
            continue;
          }
          const summary = files.get(fileSuite.file) ?? {
            tests: 0,
            seconds: 0,
            definedIn: new Set(),
          };
          summary.tests += 1;
          summary.seconds += (test.results.at(-1)?.duration ?? 0) / 1000;
          if (spec.file !== fileSuite.file) {
            summary.definedIn.add(spec.file);
          }
          files.set(fileSuite.file, summary);
        }
      }
      suite.suites?.forEach(visit);
    };
    visit(fileSuite);
  }
  return files;
}

/**
 * Assigns files to shards longest-first, each to the least-loaded shard.
 * Deterministic for the same inputs, so every shard computes the same split.
 */
export function planShards(
  testsPerFile: Map<string, number>,
  timings: Timings,
  total: number,
): { files: string[][]; seconds: number[] } {
  let knownSeconds = 0;
  let knownTests = 0;
  for (const file of testsPerFile.keys()) {
    const recorded = timings[file];
    if (recorded !== undefined) {
      knownSeconds += recorded.seconds;
      knownTests += recorded.tests;
    }
  }
  const secondsPerTest = knownTests > 0 ? knownSeconds / knownTests : DEFAULT_SECONDS_PER_TEST;

  const estimates = [...testsPerFile]
    .filter(([, tests]) => tests > 0)
    .map(([file, tests]) => {
      const recorded = timings[file];
      const seconds = recorded
        ? (recorded.seconds * tests) / recorded.tests
        : tests * secondsPerTest;
      return { file, seconds };
    })
    .sort((a, b) => b.seconds - a.seconds || a.file.localeCompare(b.file));

  const shards = Array.from({ length: total }, () => ({ files: [] as string[], seconds: 0 }));
  for (const estimate of estimates) {
    // reduce keeps the first of equally loaded shards, so ties go to the lowest index.
    const shard = shards.reduce((least, candidate) =>
      candidate.seconds < least.seconds ? candidate : least,
    );
    shard.files.push(estimate.file);
    shard.seconds += estimate.seconds;
  }
  return {
    files: shards.map((shard) => shard.files.sort()),
    seconds: shards.map((shard) => shard.seconds),
  };
}

/**
 * Averages this run's durations into the previous timings to damp runner noise,
 * rescaling the previous time first if the file's test count changed. Files
 * missing from an incomplete run keep their previous time; a complete run drops
 * files that no longer exist.
 */
export function recordTimings(
  current: Map<string, FileSummary>,
  previous: Timings,
  complete: boolean,
): Timings {
  const merged: Timings = complete ? {} : { ...previous };
  for (const [file, { seconds, tests }] of current) {
    const before = previous[file];
    const blended =
      before === undefined ? seconds : ((before.seconds * tests) / before.tests + seconds) / 2;
    merged[file] = { seconds: Math.round(blended * 10) / 10, tests };
  }
  return Object.fromEntries(Object.entries(merged).sort(([a], [b]) => a.localeCompare(b)));
}

/**
 * Parses a timings file. Anything other than file entries with finite seconds
 * and a positive test count is ignored with a warning, so a bad cache entry
 * degrades to test-count estimates instead of failing every shard's plan.
 */
export function parseTimings(content: string): Timings {
  if (!content.trim()) {
    return {};
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    parsed = undefined;
  }
  const valid =
    typeof parsed === 'object' &&
    parsed !== null &&
    !Array.isArray(parsed) &&
    Object.values(parsed).every(
      (entry: unknown) =>
        typeof entry === 'object' &&
        entry !== null &&
        'seconds' in entry &&
        'tests' in entry &&
        Number.isFinite(entry.seconds) &&
        Number.isInteger(entry.tests) &&
        (entry.tests as number) > 0,
    );
  if (!valid) {
    console.warn('::warning::Ignoring malformed e2e timings; estimating from test counts');
    return {};
  }
  return parsed as Timings;
}

function readTimings(path: string | undefined): Timings {
  if (!path) {
    return {};
  }
  try {
    return parseTimings(readFileSync(path, 'utf8'));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return {};
    }
    throw error;
  }
}

function findJsonFiles(directory: string): string[] {
  return readdirSync(directory, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.json'))
    .map((entry) => join(entry.parentPath, entry.name));
}

if (import.meta.main) {
  const { positionals, values } = parseArgs({
    allowPositionals: true,
    options: {
      project: { type: 'string', default: 'main' },
      timings: { type: 'string' },
      // plan
      list: { type: 'string' },
      'shard-index': { type: 'string' },
      'shard-total': { type: 'string' },
      // record
      reports: { type: 'string' },
      complete: { type: 'string', default: 'false' },
      out: { type: 'string' },
    },
  });
  const [command] = positionals;
  const project = values.project;

  if (command === 'plan') {
    const index = Number(values['shard-index']);
    const total = Number(values['shard-total']);
    if (!values.list || !values.out || !(index >= 1 && index <= total)) {
      throw new Error('plan needs --list, --out, and --shard-index within --shard-total');
    }
    const listed = summarizeReport(
      JSON.parse(readFileSync(values.list, 'utf8')) as JSONReport,
      project,
    );
    const testsPerFile = new Map([...listed].map(([file, { tests }]) => [file, tests]));
    const timings = readTimings(values.timings);
    const plan = planShards(testsPerFile, timings, total);

    const shardFiles = plan.files[index - 1] ?? [];
    const shardSeconds = plan.seconds[index - 1] ?? 0;
    const lines = shardFiles.flatMap((file) => [file, ...(listed.get(file)?.definedIn ?? [])]);
    writeFileSync(
      values.out,
      [...new Set(lines)].map((file) => `[${project}] › ${file}\n`).join(''),
    );

    const recorded = [...testsPerFile.keys()].filter((file) => timings[file] !== undefined).length;
    console.log(
      `Shard ${index}/${total}: ${shardFiles.length} files, ~${Math.round(shardSeconds)}s estimated ` +
        `(shards range ${Math.round(Math.min(...plan.seconds))}-${Math.round(Math.max(...plan.seconds))}s; ` +
        `${recorded}/${testsPerFile.size} files have recorded timings)`,
    );
    shardFiles.forEach((file) => console.log(`  ${file}`));
  } else if (command === 'record') {
    if (!values.reports || !values.out) {
      throw new Error('record needs --reports and --out');
    }
    const current = new Map<string, FileSummary>();
    for (const path of findJsonFiles(values.reports)) {
      for (const [file, summary] of summarizeReport(
        JSON.parse(readFileSync(path, 'utf8')) as JSONReport,
        project,
      )) {
        current.set(file, summary);
      }
    }
    const complete = values.complete === 'true';
    const timings = recordTimings(current, readTimings(values.timings), complete);
    writeFileSync(values.out, JSON.stringify(timings));
    console.log(
      `Recorded ${current.size} files from ${complete ? 'a complete' : 'an incomplete'} run; ` +
        `${Object.keys(timings).length} files in timings`,
    );
  } else {
    throw new Error('Usage: e2e-shards.ts plan|record [options]');
  }
}
