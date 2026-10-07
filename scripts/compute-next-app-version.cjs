const fs = require('node:fs');
const path = require('node:path');
const execFileSync = require('node:child_process').execFileSync;
const { parseArgs } = require('node:util');

const semver = require('semver');

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
 * @param {string} currentVersion - the version field from the app's package.json
 * @param {string[]} publishedVersions - all versions published to npm for the app
 * @returns {string} the version to publish next
 */
function computeNextVersion(currentVersion, publishedVersions) {
  const current = parseCurrentVersion(currentVersion);
  const latest = latestVersionInLine(currentVersion, publishedVersions);

  if (!latest) {
    // Fresh major.minor line — publish exactly what package.json declares.
    return current.version;
  }

  return `${current.major}.${current.minor}.${semver.patch(latest) + 1}`;
}

function parseCurrentVersion(currentVersion) {
  const current = semver.parse(currentVersion);
  if (!current) {
    throw new Error(`Invalid version "${currentVersion}" in package.json`);
  }
  return current;
}

/**
 * The highest stable version published in package.json's major.minor line, or
 * null when that line has no releases yet.
 *
 * @param {string} currentVersion - the version field from the app's package.json
 * @param {string[]} publishedVersions - all versions published to npm for the app
 * @returns {string | null}
 */
function latestVersionInLine(currentVersion, publishedVersions) {
  const current = parseCurrentVersion(currentVersion);

  const patchesInLine = publishedVersions
    .map((version) => semver.parse(version))
    // Ignore prereleases (e.g. 2.69.5-beta.1) — only stable patches in this
    // major.minor line should drive the next patch number.
    .filter(
      (version) =>
        version &&
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
 *
 * @param {string} packageName
 * @returns {string[]}
 */
function getPublishedVersions(packageName) {
  let output;

  try {
    output = execFileSync('npm', ['view', packageName, 'versions', '--json'], { encoding: 'utf8' });
  } catch (error) {
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

  const parsed = JSON.parse(trimmed);
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

  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

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

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}

module.exports = { computeNextVersion, latestVersionInLine, getPublishedVersions };
