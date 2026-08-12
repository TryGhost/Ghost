const sinon = require('sinon');
const {mockSystemTime} = require('../../../utils/clock-utils');
const {agentProvider, fixtureManager} = require('../../../utils/e2e-framework');
const assert = require('node:assert/strict');
const models = require('../../../../core/server/models');

describe('Job: Clean tokens', function () {
    let agent;
    let jobsService;
    let clock;

    beforeAll(async function () {
        agent = await agentProvider.getAdminAPIAgent();
        await fixtureManager.init('newsletters', 'members:newsletters', 'members:emails');
        await agent.loginAsOwner();

        // Only reference services after Ghost boot
        jobsService = require('../../../../core/server/services/jobs');
    });

    afterAll(function () {
        sinon.restore();
    });

    // Trigger the clean-tokens job and wait for it to finish. This helper is
    // the only part of the test coupled to the job trigger mechanism; the
    // assertions below pin behaviour and must survive a trigger change
    // unmodified.
    async function runCleanTokensJob() {
        const completedPromise = jobsService.awaitCompletion('clean-tokens');
        const job = require('path').resolve(__dirname, '../../../../core/server/services/members/jobs', 'clean-tokens.js');

        // NOTE: the job will not use the fake clock.
        await jobsService.addJob({
            job,
            name: 'clean-tokens'
        });
        // We need to tick the clock to activate 'bree' and run the job
        await clock.tickAsync(1000);
        await completedPromise;
    }

    it('Deletes tokens that are older than 24 hours', async function () {
        // Go back 25 hours (reason: the job will be run at the current time, no way to change that)
        clock = mockSystemTime(Date.now() - 25 * 60 * 60 * 1000);

        // Create some tokens
        const firstToken = await models.SingleUseToken.add({data: 'test'});

        // Wait 24 hours
        clock.tick(24 * 60 * 60 * 1000);

        const secondToken = await models.SingleUseToken.add({data: 'test'});

        // Wait one hour
        clock.tick(1 * 60 * 60 * 1000);

        await runCleanTokensJob();

        // Check second token exists
        const secondTokenExists = await models.SingleUseToken.findOne({id: secondToken.id});
        assert.ok(secondTokenExists, 'Second token should exist');

        // Check first token is deleted
        const firstTokenExists = await models.SingleUseToken.findOne({id: firstToken.id});
        assert.ok(!firstTokenExists, 'First token should not exist');
    });
});
