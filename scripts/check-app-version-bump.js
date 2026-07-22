// Verifies, on every PR touching a public UMD app, that the app's package.json
// major.minor still matches the version pinned in defaults.json. See lib for
// why that invariant matters.

import {existsSync, readFileSync} from 'node:fs';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';

import {PUBLIC_APPS, DEFAULTS_PATH, DEFAULTS_REPO_PATH, majorMinor} from './lib/public-apps.js';

const MONITORED_APP_PATHS = PUBLIC_APPS.map(app => app.path);

function runGit(args) {
    try {
        return execFileSync('git', args, {encoding: 'utf8'}).trim();
    } catch (error) {
        const stderr = error.stderr ? error.stderr.toString().trim() : '';
        const stdout = error.stdout ? error.stdout.toString().trim() : '';
        const message = stderr || stdout || error.message;
        throw new Error(`Failed to run "git ${args.join(' ')}": ${message}`);
    }
}

function readVersionFromPackageJson(packageJsonContent, sourceLabel) {
    let parsedPackageJson;

    try {
        parsedPackageJson = JSON.parse(packageJsonContent);
    } catch (error) {
        throw new Error(`Unable to parse ${sourceLabel}: ${error.message}`);
    }

    if (!parsedPackageJson.version || typeof parsedPackageJson.version !== 'string') {
        throw new Error(`${sourceLabel} does not contain a valid "version" field`);
    }

    return parsedPackageJson.version;
}

function getChangedFiles(baseSha, compareSha) {
    let mergeBaseSha;

    try {
        mergeBaseSha = runGit(['merge-base', baseSha, compareSha]);
    } catch (error) {
        throw new Error(`Unable to determine merge-base for ${baseSha} and ${compareSha}. Ensure the base branch history is available in the checkout.\n${error.message}`);
    }

    return runGit(['diff', '--name-only', mergeBaseSha, compareSha, '--', ...MONITORED_APP_PATHS])
        .split('\n')
        .map(file => file.trim())
        .filter(Boolean);
}

function getChangedAppFiles(app, changedFiles) {
    return changedFiles.filter((file) => {
        return file === app.path || file.startsWith(`${app.path}/`);
    });
}

function getChangedApps(changedFiles) {
    return PUBLIC_APPS.filter(app => getChangedAppFiles(app, changedFiles).length > 0);
}

function getPrVersion(app) {
    const packageJsonPath = join(import.meta.dirname, '..', app.path, 'package.json');

    if (!existsSync(packageJsonPath)) {
        throw new Error(`${app.path}/package.json does not exist in this PR`);
    }

    return readVersionFromPackageJson(
        readFileSync(packageJsonPath, 'utf8'),
        `${app.path}/package.json from PR`
    );
}

function readVersionFromDefaults(defaultsContent, app, sourceLabel) {
    let parsedDefaults;

    try {
        parsedDefaults = JSON.parse(defaultsContent);
    } catch (error) {
        throw new Error(`Unable to parse ${sourceLabel}: ${error.message}`);
    }

    const appDefaults = parsedDefaults[app.configKey];

    if (!appDefaults || typeof appDefaults.version !== 'string') {
        throw new Error(`${sourceLabel} does not contain a valid "${app.configKey}.version" field`);
    }

    return appDefaults.version;
}

function getPrDefaultsVersion(app) {
    if (!existsSync(DEFAULTS_PATH)) {
        throw new Error(`${DEFAULTS_REPO_PATH} does not exist in this PR`);
    }

    return readVersionFromDefaults(
        readFileSync(DEFAULTS_PATH, 'utf8'),
        app,
        `${DEFAULTS_REPO_PATH} from PR`
    );
}

/**
 * Patch releases are published automatically on merge to main, with npm as the
 * source of truth for the patch number — so PRs no longer need to bump the
 * version at all. The only invariant we still enforce is that package.json's
 * major.minor matches defaults.json, because Ghost core serves each app from
 * `<pkg>@~<major.minor>` on jsDelivr. A deliberate minor/major release (via
 * "pnpm ship") must move both in lockstep, or live sites would point at a
 * version line that never gets published.
 *
 * @returns {string|null} an error message when inconsistent, otherwise null
 */
export function checkAppConsistency(app, prVersion, prDefaultsVersion) {
    const prMajorMinorVersion = majorMinor(prVersion);

    if (prDefaultsVersion !== prMajorMinorVersion) {
        return `${app.configKey} (${app.packageName}): package.json is on ${prMajorMinorVersion} but defaults.json has ${app.configKey}.version set to ${prDefaultsVersion}. These must match — for a minor/major release run "pnpm ship" in ${app.path} (it updates both), otherwise align ${DEFAULTS_REPO_PATH} to ${prMajorMinorVersion}.`;
    }

    return null;
}

function main() {
    const baseSha = process.env.PR_BASE_SHA;
    const compareSha = process.env.PR_COMPARE_SHA || process.env.GITHUB_SHA;

    if (!baseSha) {
        throw new Error('Missing PR_BASE_SHA environment variable');
    }

    if (!compareSha) {
        throw new Error('Missing PR_COMPARE_SHA/GITHUB_SHA environment variable');
    }

    const changedFiles = getChangedFiles(baseSha, compareSha);
    const changedApps = getChangedApps(changedFiles);

    if (changedApps.length === 0) {
        console.log(`No app changes detected. Skipping app version consistency check.`);
        return;
    }

    console.log(`Checking app version consistency for: ${changedApps.map(app => app.configKey).join(', ')}`);

    const failedApps = [];

    for (const app of changedApps) {
        const error = checkAppConsistency(app, getPrVersion(app), getPrDefaultsVersion(app));

        if (error) {
            failedApps.push(error);
            continue;
        }

        console.log(`${app.configKey} version consistency check passed (package.json ${majorMinor(getPrVersion(app))} = defaults.json ${getPrDefaultsVersion(app)})`);
    }

    if (failedApps.length) {
        throw new Error(`App version consistency checks failed:\n- ${failedApps.join('\n- ')}`);
    }

    console.log('All monitored app version consistency checks passed.');
}

if (import.meta.main) {
    try {
        main();
    } catch (error) {
        console.error(error.message);
        process.exit(1);
    }
}
