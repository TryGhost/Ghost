// Whether a public app's freshly built package differs from the one already
// published on its major.minor line.
//
// The publish job fires on every merge to main where nx marks the app affected,
// and nx marks every project affected whenever a global input changes — the
// pnpm lockfile, a workflow file. Most of those merges rebuild a byte-identical
// bundle, so gating on "affected" alone burns a patch version per dependency
// bump anywhere in the monorepo.
//
// Both sides are compared as packed packages rather than as built umd/
// directories, so a manifest-only release still counts as a change — pnpm
// rewrites `catalog:` and `workspace:` specifiers into real ranges at pack time,
// and none of that shows up in the bundle. LICENSE and README.md ship in the
// tarball too but never reach a rendered site, and a change to either is not
// worth a CDN purge.
//
// Sourcemaps are excluded: they are derived from the bundle they accompany, so
// they carry no signal the bundle itself doesn't, and their mappings shift with
// the length of the version string masked below.

import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join, relative} from 'node:path';

import {ROOT_DIR} from './lib/constants.js';
import {appForPackageName, readDefaults, DEFAULTS_REPO_PATH} from './lib/public-apps.js';
import {readJson} from './lib/utils.js';

const VERSION_PLACEHOLDER = '\0version\0';

/**
 * A content hash over the publish-relevant files in a packed package, in a
 * stable order. Deliberately ignores mtimes and modes, which differ between a
 * fresh pack and an extracted published tarball without the package differing.
 *
 * Portal bakes its own version into its bundle (REACT_APP_VERSION, for its
 * Sentry release tag), and the publish job sets that version immediately before
 * building — so the two sides are always one patch apart on a string that says
 * nothing about the bundle's behaviour. Masking it is what makes them
 * comparable at all. The manifest is handled structurally instead — see
 * normalizeForHash.
 *
 * @param {string} dir
 * @param {string} version - the version baked into this copy, masked before hashing
 * @returns {string}
 */
export function hashPackage(dir, version) {
    const hash = createHash('sha256');

    for (const file of listFiles(dir).sort()) {
        hash.update(file);
        hash.update('\0');
        hash.update(normalizeForHash(file, readFileSync(join(dir, file)), version));
        hash.update('\0');
    }

    return hash.digest('hex');
}

/**
 * @param {string} file - path relative to the package root
 * @param {Buffer} contents
 * @param {string} version
 * @returns {Buffer}
 */
function normalizeForHash(file, contents, version) {
    // The manifest differs from the published one by exactly the version being
    // released, so drop the field outright. Masking the string here would also
    // rewrite any dependency pinned to the same value — @tryghost/i18n
    // normalizes to "0.0.0", which is also what an app's own version field
    // holds outside the publish job.
    if (file === 'package.json') {
        const manifest = JSON.parse(contents.toString('utf8'));
        delete manifest.version;

        return Buffer.from(JSON.stringify(manifest));
    }

    return maskVersion(contents, version);
}

/**
 * @param {Buffer} contents
 * @param {string} version
 * @returns {Buffer}
 */
export function maskVersion(contents, version) {
    // latin1 round-trips arbitrary bytes, so this is safe on any asset that
    // happens to sit in umd/ alongside the JS and CSS.
    const masked = contents.toString('latin1').replaceAll(version, VERSION_PLACEHOLDER);

    return Buffer.from(masked, 'latin1');
}

/**
 * Every file under `dir` worth comparing, as paths relative to it. README and
 * LICENSE changes do not affect sites, and sourcemaps are derived from the
 * bundle they accompany.
 *
 * @param {string} dir
 * @returns {string[]}
 */
function listFiles(dir) {
    return readdirSync(dir, {recursive: true, withFileTypes: true})
        .filter(entry => entry.isFile())
        .map(entry => relative(dir, join(entry.parentPath, entry.name)))
        .filter(file => file !== 'LICENSE' && file !== 'README.md' && !file.endsWith('.map'));
}

/**
 * Downloads and extracts the newest published tarball on `versionLine`.
 *
 * @param {string} packageName
 * @param {string} versionLine - e.g. "1.8"
 * @param {string} destination
 * @returns {string|null} the extracted package directory, or null when the line
 *   has nothing published yet
 */
function fetchPublishedPackage(packageName, versionLine, destination) {
    // `~1.8` resolves to the newest patch on the line — the one jsDelivr serves,
    // and the only one worth comparing against.
    const spec = `${packageName}@~${versionLine}`;
    let tarball;

    try {
        const output = execFileSync('npm', ['pack', spec, '--pack-destination', destination, '--json'], {
            encoding: 'utf8',
            stdio: ['ignore', 'pipe', 'pipe']
        });
        tarball = JSON.parse(output)[0].filename;
    } catch (error) {
        const combined = `${error.stdout || ''}${error.stderr || ''}`;
        if (combined.includes('E404') || combined.includes('ETARGET') || combined.includes('No matching version')) {
            return null;
        }
        throw new Error(`Failed to fetch ${spec}: ${combined || error.message}`);
    }

    execFileSync('tar', ['-xzf', join(destination, tarball), '-C', destination]);

    return join(destination, 'package');
}

/**
 * Packs the local app exactly as pnpm will normalize it for publication, then
 * extracts it for comparison.
 *
 * @param {string} appDir
 * @param {string} destination
 * @returns {string} the extracted package directory
 */
function packLocalPackage(appDir, destination) {
    const output = execFileSync('pnpm', ['pack', '--pack-destination', destination, '--json'], {
        cwd: appDir,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe']
    });
    const result = JSON.parse(output);

    if (typeof result.filename !== 'string') {
        throw new Error(`Failed to pack ${appDir}: ${result.error?.message || output}`);
    }

    execFileSync('tar', ['-xzf', result.filename, '-C', destination]);

    return join(destination, 'package');
}

async function main() {
    const packageName = process.argv[2];

    if (!packageName) {
        throw new Error('Usage: node scripts/public-app-bundle-changed.js <package-name>');
    }

    const app = appForPackageName(packageName);
    const appDir = join(ROOT_DIR, app.path);

    const defaults = await readDefaults();
    const versionLine = defaults[app.configKey]?.version;

    if (typeof versionLine !== 'string') {
        throw new Error(`${DEFAULTS_REPO_PATH} has no "${app.configKey}.version" for ${packageName}`);
    }

    const builtBundle = join(appDir, 'umd');

    if (!existsSync(builtBundle)) {
        throw new Error(`${app.path}/umd does not exist — build the package before comparing it`);
    }

    const workDir = mkdtempSync(join(tmpdir(), 'public-app-bundle-'));

    try {
        const publishedWorkDir = join(workDir, 'published');
        const localWorkDir = join(workDir, 'local');
        mkdirSync(publishedWorkDir);
        mkdirSync(localWorkDir);

        const publishedDir = fetchPublishedPackage(packageName, versionLine, publishedWorkDir);

        if (!publishedDir) {
            report(true, `Nothing published on the ${versionLine} line yet`);
            return;
        }

        const localDir = packLocalPackage(appDir, localWorkDir);
        const publishedVersion = (await readJson(join(publishedDir, 'package.json'))).version;
        const localVersion = (await readJson(join(localDir, 'package.json'))).version;

        const changed = hashPackage(publishedDir, publishedVersion) !== hashPackage(localDir, localVersion);

        report(changed, `${changed ? 'Package differs from' : 'Package is identical to'} ${packageName}@${publishedVersion}`);
    } finally {
        rmSync(workDir, {recursive: true, force: true});
    }
}

/**
 * @param {boolean} changed
 * @param {string} reason
 */
function report(changed, reason) {
    console.error(`${reason} — ${changed ? 'publishing' : 'skipping'}.`);

    // Stdout is the contract — the workflow captures this into a step output.
    process.stdout.write(String(changed));
}

if (import.meta.main) {
    try {
        await main();
    } catch (error) {
        console.error(error.message);
        process.exit(1);
    }
}
