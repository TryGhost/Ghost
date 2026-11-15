import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';
import {
  type LegacyService,
  legacyInventoryFile,
  parseLegacyServices,
  servicesRoot,
} from '../../configs/oxlint/legacy-services.ts';

// Before the legacy service inventory, one file listed every service and
// marked the standard ones with `migrated: true`. A branch can still fork from
// a commit that has it. Remove this once no open branch does.
const previousInventoryFile = `${servicesRoot}/service-inventory.yaml`;

function git(repository: string, args: string[]) {
  return execFileSync('git', args, {
    cwd: repository,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

function resolveCommit(repository: string, ref: string) {
  try {
    return git(repository, ['rev-parse', '--verify', '--quiet', `${ref}^{commit}`]).trim();
  } catch {
    return undefined;
  }
}

// The live tip of the base branch, as CI fetches it just before the check. The
// payload SHA is the fallback when the ref was never fetched into this checkout.
function resolveBase(repository: string, env: NodeJS.ProcessEnv) {
  const ref = `origin/${env.PR_BASE_REF || 'main'}`;
  const base =
    resolveCommit(repository, ref) ??
    (env.PR_BASE_SHA ? resolveCommit(repository, env.PR_BASE_SHA) : undefined);
  if (!base) {
    throw new Error(
      `Cannot find ${ref}, so the legacy services cannot be compared with their base. ` +
        `Fetch it (git fetch origin ${env.PR_BASE_REF || 'main'}) and run this check again.`,
    );
  }
  return base;
}

function fileAt(repository: string, commit: string, file: string) {
  // ls-tree succeeds with no output for a missing path; git show would only fail.
  if (!git(repository, ['ls-tree', '--name-only', commit, '--', file]).trim()) {
    return undefined;
  }
  return git(repository, ['show', `${commit}:${file}`]);
}

function legacyServicesAt(repository: string, commit: string) {
  const current = fileAt(repository, commit, legacyInventoryFile);
  if (current !== undefined) {
    return { services: parseLegacyServices(current), knowsDeferrals: true };
  }
  const previous = fileAt(repository, commit, previousInventoryFile);
  if (previous === undefined) {
    throw new Error(
      `Neither ${legacyInventoryFile} nor ${previousInventoryFile} exists at ${commit}, ` +
        'so there is nothing to compare the legacy services with.',
    );
  }
  const { services } = yaml.load(previous) as {
    services: Record<string, { migrated?: boolean }>;
  };
  const legacy = new Map<string, LegacyService>();
  for (const [name, entry] of Object.entries(services)) {
    if (entry.migrated !== true) {
      // That file did not record deferrals: they were a list in the boundary checker.
      legacy.set(name, { deferred: false });
    }
  }
  return { services: legacy, knowsDeferrals: false };
}

// The legacy services only shrink. Compare the checkout's list with the commit
// this branch forked from, so entries deleted on the base branch since then are
// not mistaken for additions here.
export function compareLegacyServicesWithBase(
  repository: string,
  env: NodeJS.ProcessEnv = process.env,
) {
  const base = resolveBase(repository, env);
  let mergeBase: string;
  try {
    mergeBase = git(repository, ['merge-base', base, 'HEAD']).trim();
  } catch {
    throw new Error(
      `Cannot find where this branch forked from ${base}. ` +
        'Make sure the checkout has the full history of both and run this check again.',
    );
  }
  const before = legacyServicesAt(repository, mergeBase);
  const now = parseLegacyServices(readFileSync(path.join(repository, legacyInventoryFile), 'utf8'));
  return {
    mergeBase,
    listed: now.size,
    added: [...now.keys()].filter((name) => !before.services.has(name)),
    // A deferred service is reported, not gated, so deferring more is growth too.
    newlyDeferred: before.knowsDeferrals
      ? [...now]
          .filter(
            ([name, service]) => service.deferred && before.services.get(name)?.deferred === false,
          )
          .map(([name]) => name)
      : [],
  };
}
