const util = require('node:util');
const exec = util.promisify(require('node:child_process').exec);
const path = require('node:path');
const fs = require('node:fs');

// Bit of a fragile path — will improve when we move these files into core
const datafileDirectory = path.join(__dirname, '..', '..', '..', 'web-analytics');
const fixtureDirectory = path.join(datafileDirectory, 'tests', 'fixtures');

async function runTbCommand(command) {
    console.log('Running Tinybird command:', command);
    const {stdout, stderr } = await exec(command);
    if (stderr) {
        return Promise.reject(new Error(stderr));
    }
    return Promise.resolve(stdout);
}

async function checkAuth() {
    const token = process.env.TB_TOKEN;
    if (!token) {
        throw new Error('TB_TOKEN is not set');
    }
    const result = await runTbCommand('tb auth');
    if (!result.includes('Auth successful')) {
        return Promise.reject(new Error('Failed to authenticate with Tinybird'));
    }
    console.log('Successfully authenticated with Tinybird');
    return Promise.resolve();

}

async function createBranch(branchName) {
    const command = `tb branch create ${branchName}`;
    const result = await runTbCommand(command);
    if (!result.includes(`Now using ${branchName}`)) {
        return Promise.reject(new Error('Failed to create Tinybird branch'));
    }
    console.log('Successfully created Tinybird branch:', branchName);
    return Promise.resolve(branchName);
}

async function deleteBranch(branchName) {
    if (branchName.toLowerCase() === 'main') {
        return Promise.reject(new Error('Cannot delete main branch'));
    }
    const command = `tb branch rm --yes ${branchName}`;
    const result = await runTbCommand(command);
    if (!result.includes(`Branch '${branchName}' deleted`)) {
        return Promise.reject(new Error('Failed to delete Tinybird branch'));
    }
    console.log('Successfully deleted Tinybird branch:', branchName);
    return Promise.resolve(branchName);
}

async function deploy() {
    const command = `tb deploy`;
    const result = await runTbCommand(command);
    if (!result.includes('Deployed')) {
        return Promise.reject(new Error('Failed to deploy Tinybird'));
    }
    console.log('Successfully deployed Tinybird');
    return Promise.resolve();
}

async function appendFixtures() {
    console.log('Appending fixtures');
    console.log('Fixture directory:', fixtureDirectory);
    const extensions = ['ndjson'];
    for (const extension of extensions) {
        const files = fs.readdirSync(fixtureDirectory, { withFileTypes: true })
            .filter(file => file.isFile() && file.name.endsWith(`.${extension}`))
            .map(file => path.join(fixtureDirectory, file.name));
        console.log('Files:', files);
        for (const file of files) {
            const file_name_without_extension = path.basename(file, `.${extension}`);
            const command = `tb datasource append ${file_name_without_extension} ${file}`;
            console.log('Command:', command);
            const result = await runTbCommand(command);
            console.log('Result:', result);
        }
    }
}


module.exports = {
    runTbCommand,
    checkAuth,
    createBranch,
    deleteBranch,
    deploy,
    appendFixtures
}
