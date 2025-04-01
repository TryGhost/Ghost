const { runTbCommand, checkAuth, createBranch, deleteBranch, deploy, appendFixtures } = require('../utils/tinybird-utils');
const assert = require('node:assert').strict;

describe('api_kpi tests', () => {
    let branchName;
    before(async () => {
        // Authenticate with Tinybird
        await checkAuth();
        // Create a new branch
        branchName = `test_${Date.now()}`;
        console.log('Creating branch:', branchName);
        await createBranch(branchName);
        // Deploy local changes
        await deploy();
        // Append fixtures
        await appendFixtures();
    });
    after(async () => {
        await deleteBranch(branchName);
    })
    it('runs a simple query', async () => {
        const result = await runTbCommand('tb pipe ls');
        assert.ok(result);
    });
});
