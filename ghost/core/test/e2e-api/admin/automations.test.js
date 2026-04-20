const sinon = require('sinon');
const domainEvents = require('@tryghost/domain-events');
const {agentProvider, fixtureManager, matchers, assertions} = require('../../utils/e2e-framework');
const localUtils = require('./utils');
const StartAutomationsPollEvent = require('../../../core/server/services/welcome-email-automations/events/start-automations-poll-event');

const {anyContentVersion, anyEtag} = matchers;
const {cacheInvalidateHeaderNotSet} = assertions;

describe('Automations API', function () {
    let agent;

    before(async function () {
        agent = await agentProvider.getAdminAPIAgent();
        await fixtureManager.init('integrations', 'api_keys');
    });

    afterEach(function () {
        sinon.restore();
    });

    it('Can poll', async function () {
        const dispatchStub = sinon.stub(domainEvents, 'dispatch');

        await agent
            .put(`automations/poll/?token=${localUtils.getValidAdminToken('/admin/')}`)
            .expectStatus(204)
            .expectEmptyBody()
            .expect(cacheInvalidateHeaderNotSet())
            .matchHeaderSnapshot({
                'content-version': anyContentVersion,
                etag: anyEtag
            });

        sinon.assert.calledOnceWithExactly(dispatchStub, sinon.match.instanceOf(StartAutomationsPollEvent));
    });
});
