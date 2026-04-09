const fs = require('fs/promises');
const exec = require('util').promisify(require('child_process').exec);
const path = require('path');

const semver = require('semver');

// Minimal replacement for @actions/core's setOutput, writing to $GITHUB_OUTPUT.
// See https://docs.github.com/en/actions/using-workflows/workflow-commands-for-github-actions#setting-an-output-parameter
function setOutput(name, value) {
    const filePath = process.env.GITHUB_OUTPUT;
    const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
    if (!filePath) {
        // Fallback: print so it's visible in logs when run outside Actions.
        console.log(`::set-output name=${name}::${stringValue}`);
        return;
    }
    // Use a random delimiter to support multi-line values safely.
    const delimiter = `ghadelimiter_${Math.random().toString(36).slice(2)}`;
    require('fs').appendFileSync(filePath, `${name}<<${delimiter}\n${stringValue}\n${delimiter}\n`);
}

(async () => {
    const corePackageJsonPath = path.join(__dirname, '../../ghost/core/package.json');
    const corePackageJson = require(corePackageJsonPath);

    const current_version = corePackageJson.version;
    console.log(`Current version: ${current_version}`);

    const firstArg = process.argv[2];
    console.log('firstArg', firstArg);

    const buildString = await exec('git rev-parse --short HEAD').then(({stdout}) => stdout.trim());

    let newVersion;

    if (firstArg === 'canary' || firstArg === 'six') {
        const bumpedVersion = semver.inc(current_version, 'minor');
        newVersion = `${bumpedVersion}-pre-g${buildString}`;
    } else {
        newVersion = `${current_version}-0-g${buildString}`;
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

    setOutput('BUILD_VERSION', newVersion);
    setOutput('GIT_COMMIT_HASH', buildString);
})();
