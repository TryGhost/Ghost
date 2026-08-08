import {join} from 'node:path';
import {createInterface} from 'node:readline/promises';

import {execAsync, readJson} from './lib/utils.js';
import {appForPackageName, readDefaults, writeDefaults, versionLineFor, bumpVersionLine, DEFAULTS_PATH} from './lib/public-apps.js';

const CURRENT_DIR = process.cwd();

const packageJsonPath = join(CURRENT_DIR, 'package.json');
const packageJson = await readJson(packageJsonPath);

const APP_NAME = packageJson.name;

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

async function getBumpType() {
    const rl = createInterface({input: process.stdin, output: process.stdout});
    // Patch releases are published automatically on every merge to main (CI
    // computes the next patch from npm), so this script only drives intentional
    // minor/major releases — the ones that move the major.minor line.
    console.log('Patch releases are published automatically on merge to main.');
    console.log('Use this only for an intentional minor or major release.\n');
    const bumpTypeInput = await rl.question('Is this a minor or major release (minor)? ');
    rl.close();
    const bumpType = bumpTypeInput.trim().toLowerCase() || 'minor';
    if (!['minor', 'major'].includes(bumpType)) {
        console.error(`Unknown bump type ${bumpTypeInput} - expected "minor" or "major" (patch releases are automated)`)
        process.exit(1);
    }
    return bumpType;
}

async function updateConfig(newLine) {
    const defaults = await readDefaults();

    defaults[app.configKey].version = newLine;

    await writeDefaults(defaults);
}

async function main() {
    await ensureEnabledApp();
    await ensureNotOnMain();
    await ensureCleanGit();

    const currentLine = versionLineFor(app, await readDefaults());

    console.log(`Running release for ${APP_NAME}`);
    console.log(`Current version line is ${currentLine}`);

    const newLine = bumpVersionLine(currentLine, await getBumpType());

    console.log(`Bumping to version line ${newLine}`);

    await updateConfig(newLine);
    await execAsync(`git add ${DEFAULTS_PATH}`);

    await execAsync(`git commit -m 'Released ${APP_NAME} v${newLine}'`);

    console.log(`Release commit created - please double check it and use "git commit --amend" to make any changes before opening a PR to merge into main`)
}

main().catch((err) => {
    console.error(`\n✗ Release failed: ${err.message}`);
    process.exit(1);
});
