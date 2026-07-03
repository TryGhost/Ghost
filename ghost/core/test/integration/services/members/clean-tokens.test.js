const sinon = require('sinon');
const {mockSystemTime} = require('../../../utils/clock-utils');
const {agentProvider, fixtureManager} = require('../../../utils/e2e-framework');
const assert = require('node:assert/strict');
const models = require('../../../../core/server/models');

describe('Job: Clean tokens', function () {
    let agent;
    let jobQueue;
    let clock;

    beforeAll(async function () {
        agent = await agentProvider.getAdminAPIAgent();
        await fixtureManager.init('newsletters', 'members:newsletters', 'members:emails');
        await agent.loginAsOwner();

        // Only reference services after Ghost boot
        jobQueue = require('../../../../core/server/services/jobs/queue').default;
    });

    afterAll(function () {
        sinon.restore();
    });

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

        // Run the job. NOTE: the handler will not use the fake clock.
        const CleanTokensJob = require('../../../../core/server/services/members/jobs/clean-tokens-job').default;
        await jobQueue.dispatch(new CleanTokensJob());
        await jobQueue.allSettled();

        // Check second token exists
        const secondTokenExists = await models.SingleUseToken.findOne({id: secondToken.id});
        assert.ok(secondTokenExists, 'Second token should exist');

        // Check first token is deleted
        const firstTokenExists = await models.SingleUseToken.findOne({id: firstToken.id});
        assert.ok(!firstTokenExists, 'First token should not exist');
    });
});
