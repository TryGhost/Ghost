// Computes the next version to publish for a public app.
//
// Releases are patch-only and automated, and the two halves of a version live
// apart: defaults.json pins the major.minor line (a human-controlled floor that
// only moves for an intentional minor/major release, via release-apps), and npm
// holds the patch number. So:
//
//   - If npm already has versions in that line, publish the next patch above
//     the highest one published there.
//   - If npm has nothing in that line yet (a fresh minor/major just landed in
//     defaults.json), publish its `.0`.
//
// The app's package.json version is a placeholder — the publish job overwrites
// it with this script's output before building. Nothing reads it as a source of
// truth, because Ghost core resolves apps via `<pkg>@~<major.minor>` on
// jsDelivr and always gets the newest published patch.

import {execFileSync} from 'node:child_process';

import semver from 'semver';

import {appForPackageName, parseVersionLine, readDefaults, versionLineFor} from './lib/public-apps.js';

/**
 * @param {string} versionLine - the app's major.minor line, e.g. "1.8"
 * @param {string[]} publishedVersions - all versions published to npm for the app
 * @returns {string} the version to publish next
 */
export function computeNextVersion(versionLine, publishedVersions) {
    const {major, minor} = parseVersionLine(versionLine);

    const patchesInLine = publishedVersions
        .map(version => semver.parse(version))
        // Ignore prereleases (e.g. 2.69.5-beta.1) — only stable patches in this
        // major.minor line should drive the next patch number.
        .filter(version => version
            && version.major === major
            && version.minor === minor
            && version.prerelease.length === 0)
        .map(version => version.patch);

    if (patchesInLine.length === 0) {
        // Fresh major.minor line — start it at .0.
        return `${major}.${minor}.0`;
    }

    return `${major}.${minor}.${Math.max(...patchesInLine) + 1}`;
}

/**
 * Reads every version published to npm for a package. Returns an empty array
 * when the package has never been published (npm exits with E404).
 *
 * @param {string} packageName
 * @returns {string[]}
 */
export function getPublishedVersions(packageName) {
    let output;

    try {
        output = execFileSync('npm', ['view', packageName, 'versions', '--json'], {encoding: 'utf8'});
    } catch (error) {
        const combined = `${error.stdout || ''}${error.stderr || ''}`;
        if (combined.includes('E404') || combined.includes('404 Not Found')) {
            return [];
        }
        throw new Error(`Failed to read published versions for ${packageName}: ${combined || error.message}`);
    }

    const trimmed = output.trim();
    if (!trimmed) {
        return [];
    }

    const parsed = JSON.parse(trimmed);
    // npm returns a bare string when only one version exists, an array otherwise.
    return Array.isArray(parsed) ? parsed : [parsed];
}

async function main() {
    const packageName = process.argv[2];

    if (!packageName) {
        throw new Error('Usage: node scripts/compute-next-app-version.js <package-name>');
    }

    const app = appForPackageName(packageName);
    const versionLine = versionLineFor(app, await readDefaults());

    // Stdout is the contract — the workflow captures this to set the version.
    process.stdout.write(computeNextVersion(versionLine, getPublishedVersions(packageName)));
}

if (import.meta.main) {
    try {
        await main();
    } catch (error) {
        console.error(error.message);
        process.exit(1);
    }
}
