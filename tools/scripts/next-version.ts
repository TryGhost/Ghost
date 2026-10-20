// Computes the version the continuous publish job should publish next for a
// manifest package, treating npm as the source of truth for the moving part.
//
// The package.json version is a human-controlled floor, not the live version:
//   patch       pins the major.minor line; npm holds the patch. The next
//               version is one patch above the highest stable release in that
//               line, or package.json's exact version when the line is new.
//   prerelease  pins X.Y.Z-<tag>.0; npm holds the counter. The next version is
//               one above the highest X.Y.Z-<tag>.N published, or package.json's
//               exact version when none is.
//
// Usage: node next-version.ts [--latest] <package-dir>
//   --latest prints the newest published version in the line instead (empty
//   when there is none), for comparing a fresh build against what's live.

import { execFile } from 'node:child_process';
import { resolve } from 'node:path';
import { parseArgs, promisify } from 'node:util';
import semver, { type SemVer } from 'semver';

import { continuousPackage, type VersioningPolicy } from './lib/publish-manifest.ts';
import { readJson } from './lib/utils.ts';

const execFileAsync = promisify(execFile);

function parseCurrent(policy: VersioningPolicy, currentVersion: string): SemVer {
  const current = semver.parse(currentVersion);
  if (!current) {
    throw new Error(`Invalid version "${currentVersion}" in package.json`);
  }
  if (policy === 'prerelease' && current.prerelease.length === 0) {
    throw new Error(
      `A prerelease package needs a prerelease version in package.json (e.g. 0.1.0-alpha.0), found "${currentVersion}"`,
    );
  }
  return current;
}

/**
 * Whether a published version belongs to the line package.json pins: the same
 * stable major.minor for a patch package, the same X.Y.Z and prerelease tag
 * for a prerelease package.
 */
function inLine(policy: VersioningPolicy, current: SemVer, version: SemVer): boolean {
  if (policy === 'patch') {
    return (
      version.major === current.major &&
      version.minor === current.minor &&
      version.prerelease.length === 0
    );
  }
  return (
    version.compareMain(current) === 0 &&
    version.prerelease.length > 0 &&
    String(version.prerelease[0]) === String(current.prerelease[0])
  );
}

/**
 * The highest published version in the line, or null when the line has no
 * releases yet.
 *
 * @param currentVersion - the version field from package.json
 * @param publishedVersions - every version published to npm
 */
export function latestInLine(
  policy: VersioningPolicy,
  currentVersion: string,
  publishedVersions: string[],
): string | null {
  const current = parseCurrent(policy, currentVersion);
  const versions = publishedVersions
    .map((version) => semver.parse(version))
    .filter((version): version is SemVer => version !== null && inLine(policy, current, version))
    .sort(semver.rcompare);
  return versions[0]?.version ?? null;
}

/** The version to publish next. */
export function nextVersion(
  policy: VersioningPolicy,
  currentVersion: string,
  publishedVersions: string[],
): string {
  const current = parseCurrent(policy, currentVersion);
  const latest = latestInLine(policy, currentVersion, publishedVersions);

  if (!latest) {
    // Fresh line — publish exactly what package.json declares.
    return current.version;
  }

  const next = semver.inc(latest, policy === 'patch' ? 'patch' : 'prerelease');
  if (!next) {
    throw new Error(`Could not increment ${latest}`);
  }
  return next;
}

/**
 * Every version published to npm for a package, or [] when it has never been
 * published (npm exits with E404).
 */
export async function getPublishedVersions(packageName: string): Promise<string[]> {
  let stdout: string;
  try {
    ({ stdout } = await execFileAsync('npm', ['view', packageName, 'versions', '--json']));
  } catch (error) {
    const failure = error as { stdout?: string; stderr?: string; message: string };
    const combined = `${failure.stdout ?? ''}${failure.stderr ?? ''}`;
    if (combined.includes('E404') || combined.includes('404 Not Found')) {
      return [];
    }
    throw new Error(
      `Failed to read published versions for ${packageName}: ${combined || failure.message}`,
    );
  }

  const trimmed = stdout.trim();
  if (!trimmed) {
    return [];
  }
  const parsed: unknown = JSON.parse(trimmed);
  // npm returns a bare string when only one version exists, an array otherwise.
  return Array.isArray(parsed) ? (parsed as string[]) : [parsed as string];
}

async function main(): Promise<void> {
  const { values, positionals } = parseArgs({
    options: { latest: { type: 'boolean', default: false } },
    allowPositionals: true,
  });
  const packageDir = resolve(positionals[0] || process.cwd());
  const { name, version } = (await readJson(resolve(packageDir, 'package.json'))) as {
    name?: string;
    version?: string;
  };
  if (!name || !version) {
    throw new Error(`${packageDir}/package.json is missing a name or version`);
  }

  const entry = continuousPackage(name);
  if (!entry) {
    throw new Error(`${name} is not in publish-manifest.json`);
  }

  const published = await getPublishedVersions(name);
  const output = values.latest
    ? (latestInLine(entry.versioning, version, published) ?? '')
    : nextVersion(entry.versioning, version, published);

  // Stdout is the contract — the workflow captures this to set the version.
  process.stdout.write(output);
}

if (import.meta.main) {
  try {
    await main();
  } catch (error) {
    console.error((error as Error).message);
    process.exit(1);
  }
}
