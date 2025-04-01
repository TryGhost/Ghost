const TinybirdCLI = require('../utils/tinybird-utils');
const assert = require('node:assert').strict;

describe('api_kpi tests', () => {
    let tb, branchName;
    before(async () => {
        // Authenticate with Tinybird
        tb = new TinybirdCLI();
        await tb.auth();
        // // Create a new branch
        branchName = `test_${Date.now()}`;
        await tb.branchCreate(branchName);
        // console.log('Creating branch:', branchName);
        await tb.branchUse(branchName);
        // Deploy local changes
        // await deploy();
        // Append fixtures
        await tb.appendFixtures();
    });

    after(async () => {
        // await tb.branchDelete(branchName);
    });

    it('runs a simple query', async () => {
        // const result = await pipeData('api_kpis__v7', {
        //     date_from: '2100-01-01',
        //     date_to: '2100-01-07',
        //     site_uuid: 'mock_site_uuid'
        // });
        // assert.ok(result);
    });
});
