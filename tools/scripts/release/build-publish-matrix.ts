// Builds the matrix for the continuous publish job, filtered to the manifest
// packages affected in the current run. The output (stdout, compact JSON
// array) feeds the job's `strategy.matrix.include` via fromJSON.
//
// Matrix context isn't available in a job-level `if:`, so the affected gate
// can't live on the publish job — instead we compute the set here in job_setup
// (mirroring the affected_playwright_matrix dynamic matrix) and the job skips
// itself when the result is `[]`.
//
// The URLs to purge for a CDN package come from defaults.json itself — see
// cdnPathsFor.

import {
  CONTINUOUS_PACKAGES,
  readDefaults,
  type DefaultsEntry,
  type VersioningPolicy,
} from '../lib/publish-manifest.ts';

const DEFAULTS = await readDefaults();

// defaults.json pins each app to a major.minor and interpolates it into the
// URLs as {version}. The publish job knows the version it just released, so we
// hand back CURRENT_MINOR for it to substitute.
const VERSION_PLACEHOLDER = '{version}';

/**
 * The jsDelivr URLs to purge for one app, read off its defaults.json entry.
 *
 * defaults.json is what Ghost core resolves at render time, so it is by
 * definition the set of assets visitors fetch. Deriving from it means the purge
 * list cannot silently fall behind: an app that starts shipping a stylesheet
 * has to be declared here or the feature breaks visibly. Every string field
 * holding a URL counts — `url` for all of them, plus `styles` for sodo-search.
 */
export function cdnPathsFor(configEntry: DefaultsEntry): string[] {
  return Object.values(configEntry)
    .filter((value) => typeof value === 'string' && value.startsWith('https://'))
    .map((url) => url.replaceAll(VERSION_PLACEHOLDER, 'CURRENT_MINOR'));
}

export interface MatrixEntry {
  package_name: string;
  package_path: string;
  versioning: VersioningPolicy;
  dist_tag: string;
  /** Newline-delimited URLs to purge; empty for a package Ghost doesn't serve from a CDN. */
  cdn_paths: string;
  install_args: string;
}

/** @param affectedProjects - nx project names affected in this run */
export function buildMatrix(affectedProjects: string[]): MatrixEntry[] {
  const affected = new Set(affectedProjects);
  return CONTINUOUS_PACKAGES.filter((pkg) => affected.has(pkg.name)).map((pkg) => {
    let cdnPaths: string[] = [];

    if (pkg.cdn) {
      const configEntry = DEFAULTS[pkg.cdn];

      // Both of these would otherwise degrade into an empty purge list,
      // which reads as success and leaves jsDelivr serving the old bundle.
      if (!configEntry) {
        throw new Error(
          `publish-manifest.json maps ${pkg.name} to cdn key "${pkg.cdn}", which defaults.json does not define`,
        );
      }

      cdnPaths = cdnPathsFor(configEntry);
      if (!cdnPaths.length) {
        throw new Error(`defaults.json entry "${pkg.cdn}" (${pkg.name}) has no CDN URLs to purge`);
      }
    }

    return {
      package_name: pkg.name,
      package_path: pkg.path,
      versioning: pkg.versioning,
      dist_tag: pkg.distTag,
      cdn_paths: cdnPaths.join('\n'),
      install_args: pkg.installArgs ?? '',
    };
  });
}

function main(): void {
  const raw = process.argv[2] || '[]';

  let affectedProjects: unknown;
  try {
    affectedProjects = JSON.parse(raw);
  } catch (error) {
    throw new Error(`Invalid affected-projects JSON: ${(error as Error).message}`);
  }

  if (!Array.isArray(affectedProjects)) {
    throw new Error('affected-projects argument must be a JSON array');
  }

  // Stdout is the contract — the workflow captures this into a job output.
  process.stdout.write(JSON.stringify(buildMatrix(affectedProjects as string[])));
}

if (import.meta.main) {
  try {
    main();
  } catch (error) {
    console.error((error as Error).message);
    process.exit(1);
  }
}
