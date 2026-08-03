// Builds the publish matrix for public UMD apps, filtered to the apps affected
// in the current run plus apps whose defaults.json version line changed. The
// output (stdout, compact JSON array) feeds the publish_public_apps job's
// `strategy.matrix.include` via fromJSON.
//
// Matrix context isn't available in a job-level `if:`, so the affected gate
// can't live on the publish job — instead we compute the set here in job_setup
// (mirroring the affected_playwright_projects dynamic matrix) and the job skips
// itself when the result is `[]`.
//
// public-apps.json says *which* apps are public (apps/ also holds admin, shade
// and friends, which are not) and maps each to its defaults.json key. The URLs
// to purge come from defaults.json itself — see cdnPathsFor.

import {DEFAULTS_REPO_PATH, PUBLIC_APPS, readDefaults} from './lib/public-apps.js';
import {getFileFromCommit} from './lib/git.js';

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
 *
 * @param {Record<string, string>} configEntry - a defaults.json app entry
 * @returns {string[]}
 */
export function cdnPathsFor(configEntry) {
    return Object.values(configEntry)
        .filter(value => typeof value === 'string' && value.startsWith('https://'))
        .map(url => url.replaceAll(VERSION_PLACEHOLDER, 'CURRENT_MINOR'));
}

/**
 * Reads defaults.json from a previous git revision so version-line releases can
 * select their app even though Nx associates defaults.json with Ghost core.
 *
 * Returns null when that revision can't be read — a base force-pushed away, or a
 * blob the treeless clone can't fetch. This runs in job_setup, which every other
 * job depends on, so a git failure must not take the whole run down with it:
 * without a base to compare against we select on the Nx affected set alone,
 * which is what this script did before version lines were considered.
 *
 * @param {string} revision
 * @returns {Promise<object|null>}
 */
export async function defaultsAtRevision(revision) {
    try {
        return JSON.parse(await getFileFromCommit(revision, DEFAULTS_REPO_PATH));
    } catch (error) {
        console.error(`Unable to read ${DEFAULTS_REPO_PATH} at ${revision} — selecting on affected projects alone: ${error.message}`);
        return null;
    }
}

/**
 * @param {string[]} affectedProjects - nx project names affected in this run
 * @param {object} previousDefaults - defaults.json at the Nx base revision
 * @returns {Array<{package_name: string, package_path: string, cdn_paths: string}>}
 *   matrix entries with cdn_paths flattened to the newline-delimited string the
 *   publish job's purge step expects.
 */
export function buildMatrix(affectedProjects, previousDefaults = DEFAULTS) {
    const affected = new Set(affectedProjects);

    for (const app of PUBLIC_APPS) {
        if (previousDefaults[app.configKey]?.version !== DEFAULTS[app.configKey]?.version) {
            affected.add(app.packageName);
        }
    }

    return PUBLIC_APPS
        .filter(app => affected.has(app.packageName))
        .map((app) => {
            const configEntry = DEFAULTS[app.configKey];

            // Both of these would otherwise degrade into an empty purge list,
            // which reads as success and leaves jsDelivr serving the old bundle.
            if (!configEntry) {
                throw new Error(`public-apps.json maps ${app.packageName} to configKey "${app.configKey}", which defaults.json does not define`);
            }

            const cdnPaths = cdnPathsFor(configEntry);
            if (!cdnPaths.length) {
                throw new Error(`defaults.json entry "${app.configKey}" (${app.packageName}) has no CDN URLs to purge`);
            }

            return {
                package_name: app.packageName,
                package_path: app.path,
                cdn_paths: cdnPaths.join('\n')
            };
        });
}

async function main() {
    const raw = process.argv[2] || '[]';
    const baseRevision = process.argv[3];

    let affectedProjects;
    try {
        affectedProjects = JSON.parse(raw);
    } catch (error) {
        throw new Error(`Invalid affected-projects JSON: ${error.message}`);
    }

    if (!Array.isArray(affectedProjects)) {
        throw new Error('affected-projects argument must be a JSON array');
    }

    // No base revision (tag builds skip nx-set-shas) or an unreadable one both
    // mean "nothing to compare against", which buildMatrix reads as no version
    // line having moved.
    const previousDefaults = (baseRevision && await defaultsAtRevision(baseRevision)) || DEFAULTS;

    // Stdout is the contract — the workflow captures this into a job output.
    process.stdout.write(JSON.stringify(buildMatrix(affectedProjects, previousDefaults)));
}

if (import.meta.main) {
    try {
        await main();
    } catch (error) {
        console.error(error.message);
        process.exit(1);
    }
}
