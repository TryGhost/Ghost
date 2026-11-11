import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { ICruiseResult, IViolation } from 'dependency-cruiser';
import yaml from 'js-yaml';
import { z } from 'zod';

export const knownViolationsFile = '.dependency-cruiser-known-violations.json';
const servicesRoot = 'ghost/core/server/services/';
const knownViolationSchema = z.strictObject({
  rule: z.enum(['service-dependencies', 'service-own-root', 'service-unresolved']),
  from: z.string().startsWith(servicesRoot),
  to: z.string().min(1),
});
const inventorySchema = z.object({
  services: z.record(z.string(), z.object({ migrated: z.boolean().optional() })),
});
type KnownViolation = z.infer<typeof knownViolationSchema>;

// Unmigrated services that change too often for a file-level list to hold: it
// would go stale between a pull request opening and merging. Their findings
// stay in reports but neither fail lint nor appear in the known-violations
// file. Remove a name when its service is migrated. This list should only
// shrink; a service that is not named here is checked from its first commit.
export const deferredServices: readonly string[] = [
  'automations',
  'members',
  'members-metafields',
  'stripe',
];

const serviceName = (file: string) => file.slice(servicesRoot.length).split('/')[0]!;
const isDeferred = (file: string) =>
  file.startsWith(servicesRoot) && deferredServices.includes(serviceName(file));

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

export function readKnownViolations(repository: string): KnownViolation[] {
  const known = z
    .array(knownViolationSchema)
    .parse(JSON.parse(readFileSync(path.join(repository, knownViolationsFile), 'utf8')));
  const { services } = inventorySchema.parse(
    yaml.load(readFileSync(path.join(repository, servicesRoot, 'service-inventory.yaml'), 'utf8')),
  );
  for (const name of deferredServices) {
    if (services[name]?.migrated) {
      throw new Error(
        `${name} is migrated, so its dependencies are enforced. Remove it from deferredServices.`,
      );
    }
  }
  const seen = new Set<string>();
  for (const item of known) {
    const name = serviceName(item.from);
    if (isDeferred(item.from)) {
      throw new Error(
        `${knownViolationsFile}: ${item.from} belongs to a service with deferred enforcement. Remove the entry.`,
      );
    }
    if (!services[name] || services[name].migrated) {
      throw new Error(
        `${knownViolationsFile}: ${item.from} must belong to an unmigrated inventory entry.`,
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

export function compareKnownViolations(graph: ICruiseResult, known: KnownViolation[]) {
  const current = new Set(graph.summary.violations.map((item) => key(dependencyIdentity(item))));
  const accepted = new Set(known.map(key));
  const deferred = graph.summary.violations.filter((item) => isDeferred(item.from));
  return {
    newViolations: graph.summary.violations.filter(
      (item) => !isDeferred(item.from) && !accepted.has(key(dependencyIdentity(item))),
    ),
    stale: known.filter((item) => !current.has(key(item))),
    deferred,
  };
}

// Lint and contributor reports use this single scan and known-violations file.
// Reports retain all findings; only lint uses the comparison to decide success.
export function readDependencyBoundaries(repository: string) {
  const known = readKnownViolations(repository);
  const cli = fileURLToPath(
    new URL('../../bin/dependency-cruise.mjs', import.meta.resolve('dependency-cruiser')),
  );
  const result = spawnSync(
    process.execPath,
    [cli, 'ghost/core', 'apps', '--config', '.dependency-cruiser.cjs', '--output-type', 'json'],
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
  if (!graph.modules?.length || !Array.isArray(graph.summary?.violations)) {
    throw new Error('Dependency analysis returned no modules or an invalid report.');
  }
  return { graph, ...compareKnownViolations(graph, known) };
}
