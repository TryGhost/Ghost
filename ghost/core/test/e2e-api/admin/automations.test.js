const sinon = require('sinon');
const domainEvents = require('@tryghost/domain-events');
const models = require('../../../core/server/models');
const {getSignedAdminToken} = require('../../../core/server/adapters/scheduling/utils');
const {agentProvider, fixtureManager, matchers, assertions} = require('../../utils/e2e-framework');
const StartAutomationsPollEvent = require('../../../core/server/services/welcome-email-automations/events/start-automations-poll-event');

const {anyContentVersion, anyEtag} = matchers;
const {cacheInvalidateHeaderNotSet} = assertions;

describe('Automations API', function () {
    let agent;
    let schedulerToken;

    before(async function () {
        agent = await agentProvider.getAdminAPIAgent();
        await fixtureManager.init('integrations', 'api_keys');

        const schedulerIntegration = await models.Integration.findOne({slug: 'ghost-scheduler'}, {withRelated: 'api_keys'});

        schedulerToken = getSignedAdminToken({
            publishedAt: new Date().toISOString(),
            apiUrl: '/admin/',
            integration: schedulerIntegration.toJSON()
        });
    });

    afterEach(function () {
        sinon.restore();
    });

    it('Can poll', async function () {
        const dispatchStub = sinon.stub(domainEvents, 'dispatch');

        await agent
            .put(`automations/poll/?token=${schedulerToken}`)
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
