const fs = require('fs');
const path = require('path');
const execFileSync = require('child_process').execFileSync;

const MONITORED_APPS = {
    portal: {
        packageName: '@tryghost/portal',
        path: 'apps/portal'
    },
    sodoSearch: {
        packageName: '@tryghost/sodo-search',
        path: 'apps/sodo-search'
    },
    comments: {
        packageName: '@tryghost/comments-ui',
        path: 'apps/comments-ui'
    },
    announcementBar: {
        packageName: '@tryghost/announcement-bar',
        path: 'apps/announcement-bar'
    },
    signupForm: {
        packageName: '@tryghost/signup-form',
        path: 'apps/signup-form'
    }
};

const MONITORED_APP_ENTRIES = Object.entries(MONITORED_APPS);
const MONITORED_APP_PATHS = MONITORED_APP_ENTRIES.map(([, app]) => app.path);

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

function parseSemver(version) {
    const match = version.match(/^v?(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/);

    if (!match) {
        throw new Error(`Invalid semver version "${version}"`);
    }

    const prerelease = match[4] ? match[4].split('.').map((identifier) => {
        if (/^\d+$/.test(identifier)) {
            return Number(identifier);
        }

        return identifier;
    }) : [];

    return {
        major: Number(match[1]),
        minor: Number(match[2]),
        patch: Number(match[3]),
        prerelease
    };
}

function comparePrereleaseIdentifier(a, b) {
    const isANumber = typeof a === 'number';
    const isBNumber = typeof b === 'number';

    if (isANumber && isBNumber) {
        if (a === b) {
            return 0;
        }

        return a > b ? 1 : -1;
    }

    if (isANumber) {
        return -1;
    }

    if (isBNumber) {
        return 1;
    }

    if (a === b) {
        return 0;
    }

    return a > b ? 1 : -1;
}

function compareSemver(a, b) {
    const aVersion = parseSemver(a);
    const bVersion = parseSemver(b);

    if (aVersion.major !== bVersion.major) {
        return aVersion.major > bVersion.major ? 1 : -1;
    }

    if (aVersion.minor !== bVersion.minor) {
        return aVersion.minor > bVersion.minor ? 1 : -1;
    }

    if (aVersion.patch !== bVersion.patch) {
        return aVersion.patch > bVersion.patch ? 1 : -1;
    }

    const aPrerelease = aVersion.prerelease;
    const bPrerelease = bVersion.prerelease;

    if (!aPrerelease.length && !bPrerelease.length) {
        return 0;
    }

    if (!aPrerelease.length) {
        return 1;
    }

    if (!bPrerelease.length) {
        return -1;
    }

    const maxLength = Math.max(aPrerelease.length, bPrerelease.length);
    for (let i = 0; i < maxLength; i += 1) {
        const aIdentifier = aPrerelease[i];
        const bIdentifier = bPrerelease[i];

        if (aIdentifier === undefined) {
            return -1;
        }

        if (bIdentifier === undefined) {
            return 1;
        }

        const identifierComparison = comparePrereleaseIdentifier(aIdentifier, bIdentifier);
        if (identifierComparison !== 0) {
            return identifierComparison;
        }
    }

    return 0;
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

function getChangedApps(changedFiles) {
    return MONITORED_APP_ENTRIES
        .filter(([, app]) => {
            return changedFiles.some((file) => {
                return file === app.path || file.startsWith(`${app.path}/`);
            });
        })
        .map(([key, app]) => ({key, ...app}));
}

function getPrVersion(app) {
    const packageJsonPath = path.resolve(__dirname, `../../${app.path}/package.json`);

    if (!fs.existsSync(packageJsonPath)) {
        throw new Error(`${app.path}/package.json does not exist in this PR`);
    }

    return readVersionFromPackageJson(
        fs.readFileSync(packageJsonPath, 'utf8'),
        `${app.path}/package.json from PR`
    );
}

function getMainVersion(app) {
    return readVersionFromPackageJson(
        runGit(['show', `origin/main:${app.path}/package.json`]),
        `${app.path}/package.json from main`
    );
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
        console.log(`No app changes detected. Skipping version bump check.`);
        return;
    }

    console.log(`Checking version bump for apps: ${changedApps.map(app => app.key).join(', ')}`);

    const failedApps = [];

    for (const app of changedApps) {
        const prVersion = getPrVersion(app);
        const mainVersion = getMainVersion(app);

        if (compareSemver(prVersion, mainVersion) <= 0) {
            failedApps.push(
                `${app.key} (${app.packageName}) was changed but version was not bumped above main (${prVersion} <= ${mainVersion}). Please run "yarn ship" in ${app.path} to bump the package version.`
            );
            continue;
        }

        console.log(`${app.key} version bump check passed (${prVersion} > ${mainVersion})`);
    }

    if (failedApps.length) {
        throw new Error(`Version bump checks failed:\n- ${failedApps.join('\n- ')}`);
    }

    console.log('All monitored app version bump checks passed.');
}

try {
    main();
} catch (error) {
    console.error(error.message);
    process.exit(1);
}
