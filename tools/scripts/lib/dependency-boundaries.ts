import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { findPackageJSON } from 'node:module';
import path from 'node:path';
import type { ICruiseResult, IViolation } from 'dependency-cruiser';
import { z } from 'zod';
import {
  type LegacyService,
  readLegacyServices,
  servicesRoot,
} from '../../configs/oxlint/legacy-services.ts';

export const knownViolationsFile = '.dependency-cruiser-known-violations.json';
const servicePrefix = `${servicesRoot}/`;
const knownViolationSchema = z.strictObject({
  rule: z.enum([
    'service-dependencies',
    'service-own-root',
    'service-unresolved',
    'specialist-dependencies',
  ]),
  from: z.string().startsWith(servicePrefix),
  to: z.string().min(1),
});
type KnownViolation = z.infer<typeof knownViolationSchema>;
type LegacyServices = Map<string, LegacyService>;

const serviceName = (file: string) => file.slice(servicePrefix.length).split('/')[0]!;
// Some legacy services change too often for a file-level list to hold: it would
// go stale between a pull request opening and merging. Their inventory entry
// says `dependencyChecks: deferred`. Their findings stay in reports but neither
// fail lint nor appear in the known-violations file.
const isDeferred = (file: string, legacy: LegacyServices) =>
  file.startsWith(servicePrefix) && legacy.get(serviceName(file))?.deferred === true;

// External package locations vary between pnpm stores and CI. Keep their exact
// import specifier (including subpaths); local and workspace targets stay resolved
// so moving either end of an internal dependency needs explicit review.
export function dependencyIdentity(violation: IViolation) {
  return {
    rule: violation.rule.name,
    from: violation.from,
    to:
      /(^|\/)node_modules\//.test(violation.to) && violation.unresolvedTo
        ? violation.unresolvedTo
        : violation.to,
  };
}

const key = ({ rule, from, to }: { rule: string; from: string; to: string }) =>
  JSON.stringify([rule, from, to]);

// Only a legacy service can have known violations. A service that is not
// listed in the legacy service inventory is checked from its first commit.
export function readKnownViolations(
  repository: string,
  legacy: LegacyServices = readLegacyServices(repository),
): KnownViolation[] {
  const known = z
    .array(knownViolationSchema)
    .parse(JSON.parse(readFileSync(path.join(repository, knownViolationsFile), 'utf8')));
  const seen = new Set<string>();
  for (const item of known) {
    if (isDeferred(item.from, legacy)) {
      throw new Error(
        `${knownViolationsFile}: ${item.from} belongs to a service with deferred enforcement. Remove the entry.`,
      );
    }
    if (!legacy.has(serviceName(item.from))) {
      throw new Error(
        `${knownViolationsFile}: ${item.from} does not belong to a legacy service. Remove the entry.`,
      );
    }
    if (seen.has(key(item))) {
      throw new Error(
        `${knownViolationsFile}: duplicate entry for ${item.from} → ${item.to} [${item.rule}].`,
      );
    }
    seen.add(key(item));
  }
  return known;
}

export function compareKnownViolations(
  graph: ICruiseResult,
  known: KnownViolation[],
  legacy: LegacyServices,
) {
  const current = new Set(graph.summary.violations.map((item) => key(dependencyIdentity(item))));
  const accepted = new Set(known.map(key));
  const deferred = graph.summary.violations.filter((item) => isDeferred(item.from, legacy));
  return {
    newViolations: graph.summary.violations.filter(
      (item) => !isDeferred(item.from, legacy) && !accepted.has(key(dependencyIdentity(item))),
    ),
    stale: known.filter((item) => !current.has(key(item))),
    deferred,
  };
}

// The scan treats a JavaScript file beside a TypeScript file of the same name as
// build output: it skips the JavaScript and reads the TypeScript. Node loads the
// JavaScript, so a committed one would run without being checked. Build output
// is never committed, so every tracked pair is an error. Outside a Git
// repository nothing is committed and there is nothing to report.
export function committedBuildOutput(repository: string) {
  const result = spawnSync('git', ['ls-files', '-z', '--', 'ghost/core'], {
    cwd: repository,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  });
  if (result.error || result.status !== 0) {
    return [];
  }
  const tracked = new Set(result.stdout.split('\0'));
  return [...tracked].flatMap((file) => {
    const match = /^(.*)\.([cm]?)js$/.exec(file);
    const source =
      match &&
      [`${match[1]}.${match[2]}ts`, `${match[1]}.tsx`].find((candidate) => tracked.has(candidate));
    return source ? [{ file, source }] : [];
  });
}

// Lint and contributor reports use this single scan and known-violations file.
// Reports retain all findings; only lint uses the comparison to decide success.
// Given files, only they and what they import are scanned, as the commit hook
// does. A partial scan cannot tell whether a known violation is gone, so it
// reports none as stale.
export function readDependencyBoundaries(repository: string, files: string[] = []) {
  const legacy = readLegacyServices(repository);
  const known = readKnownViolations(repository, legacy);
  const manifest = findPackageJSON('dependency-cruiser', import.meta.url);
  if (!manifest) {
    throw new Error('dependency-cruiser is not installed.');
  }
  const { bin } = z
    .object({ bin: z.object({ depcruise: z.string() }) })
    .parse(JSON.parse(readFileSync(manifest, 'utf8')));
  const cli = path.join(path.dirname(manifest), bin.depcruise);
  const result = spawnSync(
    process.execPath,
    [
      cli,
      ...(files.length ? files : ['ghost/core', 'apps']),
      '--config',
      '.dependency-cruiser.cjs',
      '--output-type',
      'json',
    ],
    {
      cwd: repository,
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024,
    },
  );
  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    throw new Error(result.stderr.trim() || `Dependency analysis failed (exit ${result.status}).`);
  }
  if (result.stderr) {
    process.stderr.write(result.stderr);
  }
  const graph: ICruiseResult = JSON.parse(result.stdout);
  // The full scan must find modules. A file list can be empty of them, when
  // every file given is one the scan skips.
  if (!Array.isArray(graph.modules) || !Array.isArray(graph.summary?.violations)) {
    throw new Error('Dependency analysis returned an invalid report.');
  }
  if (!files.length && !graph.modules.length) {
    throw new Error('Dependency analysis returned no modules.');
  }
  const comparison = compareKnownViolations(graph, known, legacy);
  return {
    graph,
    ...comparison,
    stale: files.length ? [] : comparison.stale,
    buildOutput: committedBuildOutput(repository),
  };
}
