const fs = require('fs/promises');
const exec = require('util').promisify(require('child_process').exec);
const path = require('path');

const core = require('@actions/core');
const semver = require('semver');

(async () => {
    const corePackageJsonPath = path.join(__dirname, '../../ghost/core/package.json');
    const corePackageJson = require(corePackageJsonPath);

    const current_version = corePackageJson.version;
    console.log(`Current version: ${current_version}`);

    const firstArg = process.argv[2];
    console.log('firstArg', firstArg);

    const buildString = await exec('git rev-parse --short HEAD').then(({stdout}) => stdout.trim());

    let newVersion;

    if (firstArg === 'canary') {
        const bumpedVersion = semver.inc(current_version, 'minor');
        newVersion = `${bumpedVersion}-pre-g${buildString}`;
    } else {
        const gitVersion = await exec('git describe --long HEAD').then(({stdout}) => stdout.trim().replace(/^v/, ''));
        newVersion = gitVersion;
    }

    newVersion += '+moya';
    console.log('newVersion', newVersion);

    corePackageJson.version = newVersion;
    await fs.writeFile(corePackageJsonPath, JSON.stringify(corePackageJson, null, 2));

    const adminPackageJsonPath = path.join(__dirname, '../../ghost/admin/package.json');
    const adminPackageJson = require(adminPackageJsonPath);
    adminPackageJson.version = newVersion;
    await fs.writeFile(adminPackageJsonPath, JSON.stringify(adminPackageJson, null, 2));

    console.log('Version bumped to', newVersion);

    core.setOutput('BUILD_VERSION', newVersion);
    core.setOutput('GIT_COMMIT_HASH', buildString)
})();
