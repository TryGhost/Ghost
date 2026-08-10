import {join} from 'node:path';
import {createInterface} from 'node:readline/promises';
import semver from 'semver';

import {execAsync, readJson, writeJson} from './lib/utils.js';
import {appForPackageName, readDefaults, writeDefaults, DEFAULTS_PATH, majorMinor} from './lib/public-apps.js';

const CURRENT_DIR = process.cwd();

const packageJsonPath = join(CURRENT_DIR, 'package.json');
const packageJson = await readJson(packageJsonPath);

const APP_NAME = packageJson.name;
const APP_VERSION = packageJson.version;

const app = appForPackageName(APP_NAME);

async function ensureEnabledApp() {
    if (!app) {
        console.error(`${APP_NAME} is not a public app — add it to scripts/public-apps.json to release it here`);
        process.exit(1);
    }
}

async function ensureNotOnMain() {
    const {stdout} = await execAsync(`git branch --show-current`);

    if (stdout.trim() === 'main') {
        console.error(`The release can not be done on the "main" branch`)
        process.exit(1);
    }
}

async function ensureCleanGit() {
    const {stdout} = await execAsync(`git status --porcelain`);

    if (stdout) {
        console.error(`You have local git changes - are you sure you're ready to release?`)
        console.error(`${stdout}`);
        process.exit(1);
    }
}

async function getNewVersion() {
    const rl = createInterface({input: process.stdin, output: process.stdout});
    // Patch releases are published automatically on every merge to main (CI
    // computes the next patch from npm), so this script only drives intentional
    // minor/major releases — the ones that also move the major.minor pinned in
    // defaults.json.
    console.log('Patch releases are published automatically on merge to main.');
    console.log('Use this only for an intentional minor or major release.\n');
    const bumpTypeInput = await rl.question('Is this a minor or major release (minor)? ');
    rl.close();
    const bumpType = bumpTypeInput.trim().toLowerCase() || 'minor';
    if (!['minor', 'major'].includes(bumpType)) {
        console.error(`Unknown bump type ${bumpTypeInput} - expected "minor" or "major" (patch releases are automated)`)
        process.exit(1);
    }
    return semver.inc(APP_VERSION, bumpType);
}

async function updateConfig(newVersion) {
    const defaultConfig = await readDefaults();

    // Must stay in lockstep with package.json — check-app-version-bump fails the
    // PR otherwise, and live sites would point at an unpublished version line.
    defaultConfig[app.configKey].version = majorMinor(newVersion);

    await writeDefaults(defaultConfig);
}

async function updatePackageJson(newVersion) {
    const newPkg = {...packageJson, version: newVersion};
    await writeJson(packageJsonPath, newPkg);
}

async function main() {
    await ensureEnabledApp();
    await ensureNotOnMain();
    await ensureCleanGit();

    console.log(`Running release for ${APP_NAME}`);
    console.log(`Current version is ${APP_VERSION}`);

    const newVersion = await getNewVersion();

    console.log(`Bumping to version ${newVersion}`);

    await updatePackageJson(newVersion);
    await execAsync(`git add package.json`);

    await updateConfig(newVersion);
    await execAsync(`git add ${DEFAULTS_PATH}`);

    await execAsync(`git commit -m 'Released ${APP_NAME} v${newVersion}'`);

    console.log(`Release commit created - please double check it and use "git commit --amend" to make any changes before opening a PR to merge into main`)
}

main().catch((err) => {
    console.error(`\n✗ Release failed: ${err.message}`);
    process.exit(1);
});
