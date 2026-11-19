import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
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
// repository nothing is committed and there is nothing to report. Any other
// Git failure stops the check, so it cannot pass without having looked.
export function committedBuildOutput(repository: string) {
  const result = spawnSync(
    'git',
    ['ls-files', '-z', '--', 'ghost/bootstrap', 'ghost/shared', 'ghost/core', 'kernel', 'foundry'],
    {
      cwd: repository,
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024,
      // Git's messages are matched below, so keep them untranslated.
      env: { ...process.env, LC_ALL: 'C' },
    },
  );
  if (result.error) {
    throw new Error(`Could not list tracked files: ${result.error.message}`);
  }
  if (result.status !== 0) {
    if (/not a git repository/i.test(result.stderr)) {
      return [];
    }
    throw new Error(
      `Could not list tracked files (git exit ${result.status}): ${result.stderr.trim()}`,
    );
  }
  const tracked = new Set(result.stdout.split('\0'));
  return [...tracked].flatMap((file) => {
    const match = /^(.*)\.([cm]?)js$/.exec(file);
    if (!match) {
      return [];
    }
    // The same pairs the scan skips: .ts and .tsx emit .js, .mts .mjs and .cts .cjs.
    const [, stem, kind] = match;
    const sources = kind ? [`${stem}.${kind}ts`] : [`${stem}.ts`, `${stem}.tsx`];
    const source = sources.find((candidate) => tracked.has(candidate));
    return source ? [{ file, source }] : [];
  });
}

// dependency-cruiser loads the `typescript` package only if it can find it, and
// carries on without it: it then skips TypeScript files or reads their type-only
// imports as ordinary ones, and reports different violations with no error.
// Whether it finds the package depends on how the scan was started. In pnpm's
// default layout here, dependency-cruiser sits in a store outside the
// repository and finds `typescript` only through the NODE_PATH and module hook
// that pnpm sets for what it runs. In the layout CI and Docker use, it finds the
// root's `typescript` by walking up from node_modules.
//
// Returns the compiler a scan used, such as `typescript@6.0.3`, from the
// transpilers its report lists under summary.environment, or undefined when it
// had none. A compiler dependency-cruiser can find but not load is listed as
// available, with `-` for its version. Its own missing-compiler warning does not
// cover that case and does not fail the scan.
export function scannerTypeScript(transpilers: unknown) {
  const found = z
    .array(z.object({ name: z.string(), available: z.boolean(), currentVersion: z.string() }))
    .safeParse(transpilers)
    .data?.find(({ name }) => name === 'typescript');
  return found?.available && found.currentVersion.startsWith('typescript@')
    ? found.currentVersion
    : undefined;
}

export const missingTypeScript =
  'dependency-cruiser could not load the `typescript` package. Without it the scan skips TypeScript files or reads type-only imports as ordinary imports, and reports different violations. Run the scan through pnpm, for example `pnpm lint:boundaries`. If that fails too, run `pnpm install`.';

// The full scan covers the framework packages, Ghost's bootstrap and shared
// modules, Core and the apps. The first four are skipped where they are absent, as in the fixture
// repositories of the tool tests.
const scanRoots = (repository: string) => [
  ...['kernel/src', 'foundry/src', 'ghost/bootstrap', 'ghost/shared'].filter((root) =>
    existsSync(path.join(repository, root)),
  ),
  'ghost/core',
  'apps',
];

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
      ...(files.length ? files : scanRoots(repository)),
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
  // The scan succeeds without TypeScript, so its report is checked, not its exit.
  if (!scannerTypeScript(graph.summary?.environment?.transpilersFound)) {
    throw new Error(missingTypeScript);
  }
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
