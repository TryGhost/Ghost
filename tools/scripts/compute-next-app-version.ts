import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { parseArgs } from 'node:util';

import semver from 'semver';

/**
 * Computes the next version to publish for a public app, treating npm as the
 * source of truth for the patch number.
 *
 * Releases are patch-only and automated: the app's package.json pins the
 * major.minor "line" (a human-controlled floor that only moves for intentional
 * minor/major releases), and the live patch number lives in npm. So:
 *
 *   - If npm already has versions in the package.json major.minor line, publish
 *     the next patch above the highest one published there.
 *   - If npm has nothing in that line yet (a fresh minor/major just landed in
 *     package.json + defaults.json), publish package.json's exact version.
 *
 * The package.json patch digit is otherwise unused — Ghost core resolves apps
 * via `<pkg>@~<major.minor>` on jsDelivr, so it always tracks the newest
 * published patch regardless of what package.json says.
 *
 * `currentVersion` is the version field from the app's package.json;
 * `publishedVersions` is every version published to npm for the app.
 */
export function computeNextVersion(currentVersion: string, publishedVersions: string[]): string {
  const current = parseCurrentVersion(currentVersion);
  const latest = latestVersionInLine(currentVersion, publishedVersions);

  if (!latest) {
    // Fresh major.minor line — publish exactly what package.json declares.
    return current.version;
  }

  return `${current.major}.${current.minor}.${semver.patch(latest) + 1}`;
}

function parseCurrentVersion(currentVersion: string): semver.SemVer {
  const current = semver.parse(currentVersion);
  if (!current) {
    throw new Error(`Invalid version "${currentVersion}" in package.json`);
  }
  return current;
}

/**
 * The highest stable version published in package.json's major.minor line, or
 * null when that line has no releases yet.
 */
export function latestVersionInLine(
  currentVersion: string,
  publishedVersions: string[],
): string | null {
  const current = parseCurrentVersion(currentVersion);

  const patchesInLine = publishedVersions
    .map((version) => semver.parse(version))
    // Ignore prereleases (e.g. 2.69.5-beta.1) — only stable patches in this
    // major.minor line should drive the next patch number.
    .filter(
      (version): version is semver.SemVer =>
        version !== null &&
        version.major === current.major &&
        version.minor === current.minor &&
        version.prerelease.length === 0,
    )
    .map((version) => version.patch);

  if (patchesInLine.length === 0) {
    return null;
  }

  return `${current.major}.${current.minor}.${Math.max(...patchesInLine)}`;
}

/**
 * Reads every version published to npm for a package. Returns an empty array
 * when the package has never been published (npm exits with E404).
 */
export function getPublishedVersions(packageName: string): string[] {
  let output: string;

  try {
    output = execFileSync('npm', ['view', packageName, 'versions', '--json'], { encoding: 'utf8' });
  } catch (err) {
    const error = err as Error & { stdout?: string; stderr?: string };
    const combined = `${error.stdout || ''}${error.stderr || ''}`;
    if (combined.includes('E404') || combined.includes('404 Not Found')) {
      return [];
    }
    throw new Error(
      `Failed to read published versions for ${packageName}: ${combined || error.message}`,
    );
  }

  const trimmed = output.trim();
  if (!trimmed) {
    return [];
  }

  const parsed: string | string[] = JSON.parse(trimmed);
  // npm returns a bare string when only one version exists, an array otherwise.
  return Array.isArray(parsed) ? parsed : [parsed];
}

function main() {
  const { values, positionals } = parseArgs({
    // --latest prints the newest published version in the line instead (empty
    // when there is none), for comparing a fresh build against what's live.
    options: { latest: { type: 'boolean', default: false } },
    allowPositionals: true,
  });
  const packageDir = positionals[0] || process.cwd();
  const packageJsonPath = path.resolve(packageDir, 'package.json');

  const packageJson: { name?: string; version?: string } = JSON.parse(
    fs.readFileSync(packageJsonPath, 'utf8'),
  );

  if (!packageJson.name || !packageJson.version) {
    throw new Error(`${packageJsonPath} is missing a name or version`);
  }

  const publishedVersions = getPublishedVersions(packageJson.name);
  const output = values.latest
    ? latestVersionInLine(packageJson.version, publishedVersions) || ''
    : computeNextVersion(packageJson.version, publishedVersions);

  // Stdout is the contract — the workflow captures this to set the version.
  process.stdout.write(output);
}

if (import.meta.main) {
  try {
    main();
  } catch (error) {
    console.error((error as Error).message);
    process.exit(1);
  }
}
