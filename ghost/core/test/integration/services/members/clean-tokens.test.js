const sinon = require('sinon');
const logging = require('@tryghost/logging');
const {mockSystemTime} = require('../../../utils/clock-utils');
const {agentProvider, fixtureManager} = require('../../../utils/e2e-framework');
const assert = require('node:assert/strict');
const models = require('../../../../core/server/models');
const {getInstance: getJobsService} = require('../../../../core/server/services/jobs-service');
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

        const loggingInfoSpy = sinon.spy(logging, 'info');

        await getJobsService().dispatch(new CleanTokensJob());

        const firstDeleted = await waitFor(async () => {
            const exists = await models.SingleUseToken.findOne({id: firstToken.id});
            return !exists;
        });
        assert.ok(firstDeleted, 'First token (older than 24h) should be deleted by the dispatched job');

        const secondTokenExists = await models.SingleUseToken.findOne({id: secondToken.id});
        assert.ok(secondTokenExists, 'Second token (younger than 24h) should still exist');

        const completionLog = loggingInfoSpy.getCalls().find((call) => {
            return call.args[0]?.system?.event === 'clean_tokens.completed';
        });
        assert.ok(completionLog, 'The handler logs a structured clean_tokens.completed event');
        assert.equal(typeof completionLog.args[0].system.deleted_count, 'number');
        assert.equal(typeof completionLog.args[0].system.duration_ms, 'number');
    });
});
