// Shared vocabulary for the public UMD apps (portal, comments-ui, ...) — the
// manifest, the config that pins their versions, and the major.minor rule that
// ties those together.
//
// The rule: Ghost core serves each app from `<pkg>@~<major.minor>` on jsDelivr,
// so an app's package.json major.minor must equal its defaults.json version.
// `release-apps` writes that pair and `check-app-version-bump` verifies it on
// every PR — they have to agree on what major.minor means, hence majorMinor
// living here rather than one implementation each.

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
 * The `major.minor` line a version belongs to — the form defaults.json pins and
 * jsDelivr resolves. Rejects a malformed version loudly rather than letting it
 * become a silently wrong CDN path.
 *
 * @param {string} version
 * @returns {string} e.g. "2.69"
 */
export function majorMinor(version) {
    const parsed = semver.parse(version);

    if (!parsed) {
        throw new Error(`Invalid semver version "${version}"`);
    }

    return `${parsed.major}.${parsed.minor}`;
}
