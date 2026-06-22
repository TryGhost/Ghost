#!/usr/bin/env node

const {spawnSync} = require('node:child_process');
const {readFileSync} = require('node:fs');
const readline = require('node:readline/promises');

const releaseTypes = new Set([
    'major',
    'minor',
    'patch',
    'premajor',
    'preminor',
    'prepatch',
    'prerelease'
]);

function run(command, args, options = {}) {
    const result = spawnSync(command, args, {
        stdio: 'inherit',
        ...options
    });

    if (result.error) {
        console.error(result.error.message);
        process.exit(1);
    }

    if (result.status !== 0) {
        process.exit(result.status ?? 1);
    }
}

function read(command, args) {
    const result = spawnSync(command, args, {
        encoding: 'utf8'
    });

    if (result.error) {
        console.error(result.error.message);
        process.exit(1);
    }

    if (result.status !== 0) {
        process.stderr.write(result.stderr);
        process.exit(result.status ?? 1);
    }

    return result.stdout;
}

function assertCleanWorkingTree() {
    const status = read('git', ['status', '--porcelain']);

    if (status.trim()) {
        console.error('Working tree must be clean before shipping:');
        process.stderr.write(status);
        process.exit(1);
    }
}

function getPackageVersion() {
    const packageJson = JSON.parse(readFileSync('package.json', 'utf8'));
    return packageJson.version;
}

function incrementVersion(version, releaseType) {
    const match = version.match(/^(\d+)\.(\d+)\.(\d+)/);

    if (!match) {
        return null;
    }

    let major = Number(match[1]);
    let minor = Number(match[2]);
    let patch = Number(match[3]);

    switch (releaseType) {
    case 'major':
        major += 1;
        minor = 0;
        patch = 0;
        break;
    case 'minor':
        minor += 1;
        patch = 0;
        break;
    case 'patch':
        patch += 1;
        break;
    default:
        return null;
    }

    return `${major}.${minor}.${patch}`;
}

function normalizeVersionArg(value) {
    if (!value) {
        return null;
    }

    return value.replace(/^v(?=\d)/, '');
}

async function promptForVersion(currentVersion) {
    if (!process.stdin.isTTY) {
        console.error('Usage: pnpm ship -- <major|minor|patch|premajor|preminor|prepatch|prerelease|version>');
        process.exit(1);
    }

    const nextPatch = incrementVersion(currentVersion, 'patch');
    const nextMinor = incrementVersion(currentVersion, 'minor');
    const nextMajor = incrementVersion(currentVersion, 'major');

    console.log(`Current version: ${currentVersion}`);
    console.log(`1) patch ${nextPatch ?? ''}`.trim());
    console.log(`2) minor ${nextMinor ?? ''}`.trim());
    console.log(`3) major ${nextMajor ?? ''}`.trim());
    console.log('4) custom version');
    console.log('5) cancel');

    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    try {
        const answer = (await rl.question('Select a release version: ')).trim();

        if (answer === '1' || answer === 'patch') {
            return 'patch';
        }

        if (answer === '2' || answer === 'minor') {
            return 'minor';
        }

        if (answer === '3' || answer === 'major') {
            return 'major';
        }

        if (answer === '4' || answer === 'custom') {
            const customVersion = normalizeVersionArg((await rl.question('New version: ')).trim());

            if (!customVersion) {
                console.error('No version entered.');
                process.exit(1);
            }

            return customVersion;
        }

        console.error('Shipping cancelled.');
        process.exit(answer === '5' || answer === '' ? 0 : 1);
    } finally {
        rl.close();
    }
}

async function main() {
    assertCleanWorkingTree();

    const currentVersion = getPackageVersion();
    const requestedVersion = normalizeVersionArg(process.argv[2]) ?? await promptForVersion(currentVersion);

    if (!releaseTypes.has(requestedVersion) && !/^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z-.]+)?$/.test(requestedVersion)) {
        console.error(`Invalid release version: ${requestedVersion}`);
        console.error('Use a semver value or one of: major, minor, patch, premajor, preminor, prepatch, prerelease');
        process.exit(1);
    }

    run('pnpm', ['version', requestedVersion, '--message', 'v%s']);
    run('pnpm', ['publish']);
    run('git', ['push', '--follow-tags']);
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
