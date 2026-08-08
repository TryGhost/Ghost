// Shared vocabulary for the public UMD apps (portal, comments-ui, ...) — the
// manifest and the config that pins their versions.
//
// Ghost core serves each app from `<pkg>@~<major.minor>` on jsDelivr, so
// defaults.json is the source of truth for which line an app publishes on:
// `release-apps` moves it for a minor/major release and
// `compute-next-app-version` reads it on every publish.

import {writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import semver from 'semver';

import {ROOT_DIR, SCRIPTS_DIR} from './constants.js';
import {readJson} from './utils.js';

/**
 * Which apps are public UMD apps, and the defaults.json key each maps to.
 *
 * Neither half is derivable. apps/ also holds admin, shade, activitypub and the
 * admin-x packages, which are not published to the CDN — the filesystem can't
 * tell you which six are. And comments-ui camel-cases to `commentsUi`, but its
 * key is `comments`.
 *
 * @type {Array<{packageName: string, path: string, configKey: string}>}
 */
export const PUBLIC_APPS = await readJson(join(SCRIPTS_DIR, 'public-apps.json'));

/** The Ghost core config pinning each app's major.minor and CDN URLs. */
export const DEFAULTS_REPO_PATH = 'ghost/core/core/shared/config/defaults.json';
export const DEFAULTS_PATH = join(ROOT_DIR, DEFAULTS_REPO_PATH);

export const readDefaults = () => readJson(DEFAULTS_PATH);

/** @param {object} defaults - the full defaults.json object */
export const writeDefaults = defaults => writeFile(DEFAULTS_PATH, JSON.stringify(defaults, null, 4) + '\n');

/** @param {string} packageName */
export function appForPackageName(packageName) {
    const app = PUBLIC_APPS.find(a => a.packageName === packageName);
    if (!app) {
        throw new Error(`App ${packageName} not found in public-apps.json`);
    }

    return app;
}

/**
 * Parses a `major.minor` version line as pinned in defaults.json. Rejects a
 * malformed line loudly rather than letting it become a silently wrong CDN path.
 *
 * @param {string} line - e.g. "2.69"
 * @returns {{major: number, minor: number}}
 */
export function parseVersionLine(line) {
    const parsed = semver.coerce(line);

    if (!parsed || `${parsed.major}.${parsed.minor}` !== line) {
        throw new Error(`Invalid major.minor version line "${line}"`);
    }

    return {major: parsed.major, minor: parsed.minor};
}

/**
 * The version line an app currently publishes on.
 *
 * @param {{configKey: string, packageName: string}} app
 * @param {object} defaults - the full defaults.json object
 * @returns {string} e.g. "2.69"
 */
export function versionLineFor(app, defaults) {
    const line = defaults[app.configKey]?.version;

    if (typeof line !== 'string') {
        throw new Error(`${DEFAULTS_REPO_PATH} has no "${app.configKey}.version" for ${app.packageName}`);
    }

    return line;
}

/**
 * The next version line for a deliberate minor/major release.
 *
 * @param {string} line - e.g. "2.69"
 * @param {'minor'|'major'} bumpType
 * @returns {string} e.g. "2.70" or "3.0"
 */
export function bumpVersionLine(line, bumpType) {
    const {major, minor} = parseVersionLine(line);

    return bumpType === 'major' ? `${major + 1}.0` : `${major}.${minor + 1}`;
}
