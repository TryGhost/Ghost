const path = require('path');
const fs = require('fs/promises');
const exec = require('util').promisify(require('child_process').exec);
const readline = require('readline/promises');

const semver = require('semver');

// Maps a package name to the config key in defaults.json
const CONFIG_KEYS = {
    '@tryghost/portal': 'portal',
    '@tryghost/sodo-search': 'sodoSearch',
    '@tryghost/comments-ui': 'comments'
};

const CURRENT_DIR = process.cwd();

const packageJsonPath = path.join(CURRENT_DIR, 'package.json');
const packageJson = require(packageJsonPath);

const APP_NAME = packageJson.name;
const APP_VERSION = packageJson.version;

async function safeExec(command) {
    try {
        return await exec(command);
    } catch (err) {
        return {
            stdout: err.stdout,
            stderr: err.stderr
        };
    }
}

async function ensureEnabledApp() {
    const ENABLED_APPS = Object.keys(CONFIG_KEYS);
    if (!ENABLED_APPS.includes(APP_NAME)) {
        console.error(`${APP_NAME} is not enabled, please modify ${__filename}`);
        process.exit(1);
    }
}

async function ensureNotOnMain() {
    const currentGitBranch = await safeExec(`git branch --show-current`);
    if (currentGitBranch.stderr) {
        console.error(`There was an error checking the current git branch`)
        console.error(`${currentGitBranch.stderr}`);
        process.exit(1);
    }

    if (currentGitBranch.stdout.trim() === 'main') {
        console.error(`The release can not be done on the "main" branch`)
        process.exit(1);
    }
}

async function ensureCleanGit() {
    const localGitChanges = await safeExec(`git status --porcelain`);
    if (localGitChanges.stderr) {
        console.error(`There was an error checking the local git status`)
        console.error(`${localGitChanges.stderr}`);
        process.exit(1);
    }

    if (localGitChanges.stdout) {
        console.error(`You have local git changes - are you sure you're ready to release?`)
        console.error(`${localGitChanges.stdout}`);
        process.exit(1);
    }
}

async function getNewVersion() {
    const rl = readline.createInterface({input: process.stdin, output: process.stdout});
    const bumpTypeInput = await rl.question('Is this a patch, minor or major (patch)? ');
    rl.close();
    const bumpType = bumpTypeInput.trim().toLowerCase() || 'patch';
    if (!['patch', 'minor', 'major'].includes(bumpType)) {
        console.error(`Unknown bump type ${bumpTypeInput} - expected one of "patch", "minor, "major"`)
        process.exit(1);
    }
    return semver.inc(APP_VERSION, bumpType);
}

async function updateConfig(newVersion) {
    const defaultConfigPath = path.resolve(__dirname, '../../ghost/core/core/shared/config/defaults.json');
    const defaultConfig = require(defaultConfigPath);

    const configKey = CONFIG_KEYS[APP_NAME];

    defaultConfig[configKey].version = `${semver.major(newVersion)}.${semver.minor(newVersion)}`;

    await fs.writeFile(defaultConfigPath, JSON.stringify(defaultConfig, null, 4) + '\n');
}

async function updatePackageJson(newVersion) {
    const newPackageJson = Object.assign({}, packageJson, {
        version: newVersion
    });

    await fs.writeFile(packageJsonPath, JSON.stringify(newPackageJson, null, 2) + '\n');
}

async function getChangelog(newVersion) {
    const rl = readline.createInterface({input: process.stdin, output: process.stdout});
    const i18nChangesInput = await rl.question('Does this release contain i18n updates (Y/n)? ');
    rl.close();

    const i18nChanges = i18nChangesInput.trim().toLowerCase() !== 'n';

    let changelogItems = [];

    if (i18nChanges) {
        changelogItems.push('Updated i18n translations');
    }

    const lastFiftyCommits = await safeExec(`git log -n 50 --oneline .`);

    if (lastFiftyCommits.stderr) {
        console.error(`There was an error getting the last 50 commits`);
        process.exit(1);
    }

    const lastFiftyCommitsList = lastFiftyCommits.stdout.split('\n');
    const releaseRegex = new RegExp(`Released ${APP_NAME} v${APP_VERSION}`);
    const indexOfLastRelease = lastFiftyCommitsList.findIndex((commitLine) => {
        const commitMessage = commitLine.slice(11); // Take the hash off the front
        return releaseRegex.test(commitMessage);
    });

    if (indexOfLastRelease === -1) {
        console.warn(`Could not find commit for previous release.`);
    } else {
        const lastReleaseCommit = lastFiftyCommitsList[indexOfLastRelease];
        const lastReleaseCommitHash = lastReleaseCommit.slice(0, 10);

        const commitsSinceLastRelease = await safeExec(`git log ${lastReleaseCommitHash}..HEAD --pretty=format:"%h%n%B__SPLIT__"`);
        if (commitsSinceLastRelease.stderr) {
            console.error(`There was an error getting commits since the last release`);
            process.exit(1);
        }
        const commitsSinceLastReleaseList = commitsSinceLastRelease.stdout.split('__SPLIT__');

        const commitsSinceLastReleaseWhichMentionLinear = commitsSinceLastReleaseList.filter((commitBlock) => {
            return commitBlock.includes('https://linear.app/ghost');
        });

        const commitChangelogItems = commitsSinceLastReleaseWhichMentionLinear.map((commitBlock) => {
            const [hash] = commitBlock.split('\n');
            return `https://github.com/TryGhost/Ghost/commit/${hash}`;
        });
        changelogItems.push(...commitChangelogItems);
    }

    const changelogList = changelogItems.map(item => `  - ${item}`).join('\n');
    return `Changelog for v${APP_VERSION} -> ${newVersion}: \n${changelogList}`;
}

async function main() {
    await ensureEnabledApp();
    await ensureNotOnMain();
    await ensureCleanGit();

    console.log(`Running release for ${APP_NAME}`);
    console.log(`Current version is ${APP_VERSION}`);

    const newVersion = await getNewVersion();

    console.log(`Bumping to version ${newVersion}`);

    const changelog = await getChangelog(newVersion);

    await updatePackageJson(newVersion);
    await exec(`git add package.json`);

    await updateConfig(newVersion);
    await exec(`git add ../../ghost/core/core/shared/config/defaults.json`);

    await exec(`git commit -m 'Released ${APP_NAME} v${newVersion}\n\n${changelog}'`);

    console.log(`Release commit created - please double check it and use "git commit --amend" to make any changes before opening a PR to merge into main`)
}

main();
