const fs = require('fs');
const path = require('path');
const execFileSync = require('child_process').execFileSync;

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

function main() {
    const baseSha = process.env.PR_BASE_SHA;
    const compareSha = process.env.PR_COMPARE_SHA || process.env.GITHUB_SHA;

    if (!baseSha) {
        throw new Error('Missing PR_BASE_SHA environment variable');
    }

    if (!compareSha) {
        throw new Error('Missing PR_COMPARE_SHA/GITHUB_SHA environment variable');
    }

    const changedFiles = runGit(['diff', '--name-only', baseSha, compareSha, '--', 'apps/portal'])
        .split('\n')
        .map(file => file.trim())
        .filter(Boolean);

    if (changedFiles.length === 0) {
        console.log('No changes detected in apps/portal. Skipping version bump check.');
        return;
    }

    const portalPackageJsonPath = path.resolve(__dirname, '../../apps/portal/package.json');

    if (!fs.existsSync(portalPackageJsonPath)) {
        throw new Error('apps/portal/package.json does not exist in this PR');
    }

    const prVersion = readVersionFromPackageJson(
        fs.readFileSync(portalPackageJsonPath, 'utf8'),
        'apps/portal/package.json from PR'
    );
    const mainVersion = readVersionFromPackageJson(
        runGit(['show', 'origin/main:apps/portal/package.json']),
        'apps/portal/package.json from main'
    );

    if (compareSemver(prVersion, mainVersion) <= 0) {
        throw new Error(
            `apps/portal changed in this PR, but version was not bumped above main (${prVersion} <= ${mainVersion}). Please run "yarn ship" in apps/portal to bump the package version.`
        );
    }

    console.log(`apps/portal changed and version bump check passed (${prVersion} > ${mainVersion})`);
}

try {
    main();
} catch (error) {
    console.error(error.message);
    process.exit(1);
}
