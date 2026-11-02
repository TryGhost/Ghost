// The continuous publish lane: packages that CI publishes to npm whenever a
// merge to main changes what they ship, with npm (not the repo) holding the
// moving part of the version. Everything else that is publishable goes through
// changesets and the weekly release instead (see publish-packages.js).
//
// publish-manifest.json lists the lane's members. Per entry:
//   name        npm package name; also the nx project name
//   path        workspace-relative directory
//   versioning  "patch": package.json pins the major.minor line and npm holds
//               the patch number, so a merge publishes the next patch.
//               "prerelease": package.json pins X.Y.Z-<tag>.0 and npm holds the
//               prerelease counter, so a merge publishes the next X.Y.Z-<tag>.N.
//   distTag     npm dist-tag to publish under. Defaults to "latest" for patch
//               entries; a prerelease entry must name one, since OIDC trusted
//               publishing can't retag after the fact. A prerelease entry may
//               name "latest" so a plain install gets the newest prerelease
//               (Shade and the app SDK, which have no stable release yet).
//   cdn         (patch only) the ghost/core defaults.json key whose URLs Ghost
//               serves from jsDelivr. Those URLs pin `~major.minor`, so the
//               package.json line and the defaults.json version must match
//               (release-apps writes the pair, check-app-version-bump verifies
//               it) and every publish purges the jsDelivr aliases.
//   installArgs extra `pnpm install` flags for the publish job, e.g.
//               "--ignore-scripts" for a package whose install hooks are dev-only.
//
// Neither membership nor the cdn key is derivable from the tree: apps/ also
// holds admin and friends, which never go to npm, and comments-ui's config key
// is `comments`, not `commentsUi`.

import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import semver from 'semver';
import { z } from 'zod';

import { ROOT_DIR, SCRIPTS_DIR } from './constants.ts';
import { readJson } from './utils.ts';

/** The ghost/core config pinning each CDN app's major.minor and asset URLs. */
export const DEFAULTS_REPO_PATH = 'ghost/core/shared/config/defaults.json';
export const DEFAULTS_PATH = join(ROOT_DIR, DEFAULTS_REPO_PATH);

export const VersioningPolicySchema = z.enum(['patch', 'prerelease']);
export type VersioningPolicy = z.infer<typeof VersioningPolicySchema>;

// strictObject so a misspelt key (dist_tag, cdnKey) fails loudly instead of
// silently publishing under the defaults.
const Entry = z
  .strictObject({
    name: z.string().min(1),
    path: z.string().min(1),
    versioning: VersioningPolicySchema,
    distTag: z.string().min(1).optional(),
    cdn: z.string().min(1).optional(),
    installArgs: z.string().min(1).optional(),
  })
  .superRefine((entry, ctx) => {
    // OIDC trusted publishing can't retag after the fact, so a prerelease only
    // lands on `latest` when its entry says so — never through the default.
    if (entry.versioning === 'prerelease' && !entry.distTag) {
      ctx.addIssue({
        code: 'custom',
        path: ['distTag'],
        message: `${entry.name} is a prerelease package and must name a distTag`,
      });
    }
    if (entry.cdn && entry.versioning !== 'patch') {
      ctx.addIssue({
        code: 'custom',
        path: ['cdn'],
        message: `${entry.name} has a cdn key, which only patch-versioned packages support`,
      });
    }
  })
  .transform((entry) => ({ ...entry, distTag: entry.distTag ?? 'latest' }));

const Manifest = z.array(Entry).superRefine((entries, ctx) => {
  const seen = new Set<string>();
  entries.forEach((entry, index) => {
    if (seen.has(entry.name)) {
      ctx.addIssue({
        code: 'custom',
        path: [index, 'name'],
        message: `${entry.name} is listed twice`,
      });
    }
    seen.add(entry.name);
  });
});

export type ContinuousPackage = z.infer<typeof Entry>;

/** A defaults.json app entry: a version pin plus one URL per served asset. */
export type DefaultsEntry = Record<string, string>;
export type Defaults = Record<string, DefaultsEntry>;

/**
 * Validates and normalizes the manifest. Exported so the test can run the
 * rules against fixtures; the live manifest is validated at import.
 */
export function normalizeManifest(entries: unknown): ContinuousPackage[] {
  const result = Manifest.safeParse(entries);
  if (!result.success) {
    throw new Error(`publish-manifest.json is invalid:\n${z.prettifyError(result.error)}`);
  }
  return result.data;
}

export const CONTINUOUS_PACKAGES: ContinuousPackage[] = normalizeManifest(
  await readJson(join(SCRIPTS_DIR, 'release/publish-manifest.json')),
);

/** The subset Ghost core serves from jsDelivr. */
export const CDN_PACKAGES: ContinuousPackage[] = CONTINUOUS_PACKAGES.filter((pkg) => pkg.cdn);

export const readDefaults = (): Promise<Defaults> => readJson<Defaults>(DEFAULTS_PATH);

export const writeDefaults = (defaults: Defaults): Promise<void> =>
  writeFile(DEFAULTS_PATH, JSON.stringify(defaults, null, 4) + '\n');

export function continuousPackage(name: string): ContinuousPackage | undefined {
  return CONTINUOUS_PACKAGES.find((pkg) => pkg.name === name);
}

/**
 * The `major.minor` line a version belongs to — the form defaults.json pins and
 * jsDelivr resolves. Rejects a malformed version loudly rather than letting it
 * become a silently wrong CDN path.
 */
export function majorMinor(version: string): string {
  const parsed = semver.parse(version);

  if (!parsed) {
    throw new Error(`Invalid semver version "${version}"`);
  }

  return `${parsed.major}.${parsed.minor}`;
}
