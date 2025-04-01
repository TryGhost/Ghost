const util = require('node:util');
const exec = util.promisify(require('node:child_process').exec);
const path = require('node:path');
const fs = require('node:fs');

// Bit of a fragile path — will improve when we move these files into core
const datafileDirectory = path.join(__dirname, '..', '..', '..', 'web-analytics');
const fixtureDirectory = path.join(datafileDirectory, 'tests', 'fixtures');

class TinybirdCLI {
    constructor() {
        if (!process.env.TB_TOKEN) {
            throw new Error('TB_TOKEN is not set');
        }
    }

    branch = null;

    async run(command) {
        // Some commands seem to ignore the current branch, so we need to specify it explicitly in the same child process
        if (this.branch) {
            command = `tb branch use ${this.branch} && ${command}`;

        }
        console.log('Running Tinybird command:', command);
        const {stdout, stderr } = await exec(command);
        if (stderr) {
            console.log('Error:', stderr);
            throw new Error(stderr);
        }
        console.log('Success:', stdout);
        return stdout;
    }

    async auth() {
        const command = `tb auth`;
        const result = await this.run(command);
        if (!result.includes('Auth successful')) {
            throw new Error('Failed to authenticate with Tinybird');
        }
        console.log('Successfully authenticated with Tinybird');
        return true;
    }

    async branchCreate(name) {
        const command = `tb branch create ${name}`;
        const result = await this.run(command);
        if (!result.includes(`Now using ${name}`)) {
            throw new Error('Failed to create Tinybird branch');
        }
        console.log('Successfully created Tinybird branch:', name);
        this.branch = name;
        return name;
    }

    async branchDelete(name) {
        if (name.toLowerCase() === 'main') {
            throw new Error('Cannot delete main branch');
        }
        const command = `tb branch rm --yes ${name}`;
        const result = await this.run(command);
        if (!result.includes(`Branch '${name}' deleted`)) {
            throw new Error('Failed to delete Tinybird branch');
        }
        console.log('Successfully deleted Tinybird branch:', name);
        return name;
    }

    async branchUse(name) {
        const command = `tb branch use ${name}`;
        const result = await this.run(command);
        console.log(result);
        this.branch = name;
    }

    async deploy() {
        const command = `tb deploy`;
        const result = await this.run(command);
        if (!result.includes('Deployed')) {
            throw new Error('Failed to deploy Tinybird');
        }
        console.log('Successfully deployed Tinybird');
        return result;
    }

    async appendFixtures() {
        const extensions = ['ndjson'];
        for (const extension of extensions) {
            const files = fs.readdirSync(fixtureDirectory, { withFileTypes: true })
                .filter(file => file.isFile() && file.name.endsWith(`.${extension}`))
                .map(file => path.join(fixtureDirectory, file.name));
            for (const file of files) {
                const file_name_without_extension = path.basename(file, `.${extension}`);
                const command = `tb datasource ls`;
                const result = await this.run(command);
            }
        }
    }

    async pipeData(pipeName, params) {
        const paramsString = Object.entries(params).map(([key, value]) => `--${key}=${value}`).join(' ');
        const command = `tb pipe data ${pipeName} ${paramsString}`;
        const result = await this.run(command);
        console.log('Result:', result);
        return result;
    }
}

module.exports = TinybirdCLI
