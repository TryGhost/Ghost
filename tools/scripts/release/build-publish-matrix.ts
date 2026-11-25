// Builds the matrix for the continuous publish job, filtered to the manifest
// packages affected in the current run. The output (stdout, compact JSON
// array) feeds the job's `strategy.matrix.include` via fromJSON.
//
// Matrix context isn't available in a job-level `if:`, so the affected gate
// can't live on the publish job — instead we compute the set here in job_setup
// (mirroring the affected_playwright_matrix dynamic matrix) and the job skips
// itself when the result is `[]`.
//
// With `--cdn-aliases` it prints instead every package Ghost serves from
// jsDelivr and the alias URLs it is served from, for the job that purges them.

import {
  CDN_PACKAGES,
  CONTINUOUS_PACKAGES,
  readDefaults,
  type ContinuousPackage,
  type Defaults,
  type VersioningPolicy,
} from '../lib/publish-manifest.ts';

const DEFAULTS = await readDefaults();

/** A package Ghost serves from jsDelivr: the `major.minor` line its alias follows, and the alias URLs. */
export interface CdnAlias {
  /** The package's defaults.json key, which also names the release its publish job records. */
  cdn: string;
  package: string;
  line: string;
  urls: string[];
}

/**
 * The alias of one CDN package, read off its defaults.json entry.
 *
 * defaults.json is what Ghost core resolves at render time, so it is by
 * definition the set of assets visitors fetch. Deriving from it means the purge
 * list cannot silently fall behind: an app that starts shipping a stylesheet
 * has to be declared there or the feature breaks visibly. Every string field
 * holding a URL counts — `url` for all of them, plus `styles` for sodo-search.
 */
export function cdnAlias(pkg: ContinuousPackage, defaults: Defaults): CdnAlias {
  const entry = pkg.cdn ? defaults[pkg.cdn] : undefined;

  // Both of these would otherwise degrade into an empty purge list, which
  // reads as success and leaves jsDelivr serving the old bundle.
  if (!pkg.cdn || !entry) {
    throw new Error(
      `publish-manifest.json maps ${pkg.name} to cdn key "${pkg.cdn}", which defaults.json does not define`,
    );
  }
  const line = entry.version;
  const urls = Object.values(entry).filter((value) => value.startsWith('https://'));
  if (!line || urls.length === 0) {
    throw new Error(`defaults.json entry "${pkg.cdn}" (${pkg.name}) has no CDN URLs to purge`);
  }

  return {
    cdn: pkg.cdn,
    package: pkg.name,
    line,
    urls: urls.map((url) => url.replaceAll('{version}', line)),
  };
}

export interface MatrixEntry {
  package_name: string;
  package_path: string;
  versioning: VersioningPolicy;
  dist_tag: string;
  /** The package's defaults.json key; empty for a package Ghost doesn't serve from a CDN. */
  cdn: string;
  install_args: string;
}

/** @param affectedProjects - nx project names affected in this run */
export function buildMatrix(affectedProjects: string[]): MatrixEntry[] {
  const affected = new Set(affectedProjects);
  return CONTINUOUS_PACKAGES.filter((pkg) => affected.has(pkg.name)).map((pkg) => {
    if (pkg.cdn) {
      // Refuses a package whose alias couldn't be purged, before it is published.
      cdnAlias(pkg, DEFAULTS);
    }

    return {
      package_name: pkg.name,
      package_path: pkg.path,
      versioning: pkg.versioning,
      dist_tag: pkg.distTag,
      cdn: pkg.cdn ?? '',
      install_args: pkg.installArgs ?? '',
    };
  });
}

function main(): void {
  // Stdout is the contract for both forms — the workflow captures it into a job output.
  if (process.argv[2] === '--cdn-aliases') {
    process.stdout.write(JSON.stringify(CDN_PACKAGES.map((pkg) => cdnAlias(pkg, DEFAULTS))));
    return;
  }

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
