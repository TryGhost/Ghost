const sinon = require('sinon');
const {mockSystemTime} = require('../../../utils/clock-utils');
const {agentProvider, fixtureManager} = require('../../../utils/e2e-framework');
const assert = require('node:assert/strict');
const models = require('../../../../core/server/models');
const jobsService = require('../../../../core/server/services/jobs-service');
const CleanTokensJob = require('../../../../core/server/services/members/jobs/clean-tokens-job').default;

async function waitFor(check, {timeoutMs = 5000, intervalMs = 25} = {}) {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
        if (await check()) {
            return true;
        }
        await new Promise((resolve) => {
            setTimeout(resolve, intervalMs);
        });
    }
    return false;
}

describe('Job: Clean tokens', function () {
    let agent;
    let clock;

    beforeAll(async function () {
        agent = await agentProvider.getAdminAPIAgent();
        await fixtureManager.init('newsletters', 'members:newsletters', 'members:emails');
        await agent.loginAsOwner();
    });

    afterAll(function () {
        sinon.restore();
    });

    it('Deletes tokens that are older than 24 hours', async function () {
        clock = mockSystemTime(Date.now() - 25 * 60 * 60 * 1000);
        const firstToken = await models.SingleUseToken.add({data: 'test'});
        clock.tick(24 * 60 * 60 * 1000);
        const secondToken = await models.SingleUseToken.add({data: 'test'});
        clock.tick(1 * 60 * 60 * 1000);
        clock.restore();
        clock = null;

        await jobsService.getInstance().dispatch(new CleanTokensJob());

        const firstDeleted = await waitFor(async () => {
            const exists = await models.SingleUseToken.findOne({id: firstToken.id});
            return !exists;
        });
        assert.ok(firstDeleted, 'First token (older than 24h) should be deleted by the dispatched job');

        const secondTokenExists = await models.SingleUseToken.findOne({id: secondToken.id});
        assert.ok(secondTokenExists, 'Second token (younger than 24h) should still exist');
    });
});
