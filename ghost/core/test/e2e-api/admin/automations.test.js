const sinon = require('sinon');
const domainEvents = require('@tryghost/domain-events');
const models = require('../../../core/server/models');
const {getSignedAdminToken} = require('../../../core/server/adapters/scheduling/utils');
const {agentProvider, fixtureManager, matchers, assertions} = require('../../utils/e2e-framework');
const StartAutomationsPollEvent = require('../../../core/server/services/welcome-email-automations/events/start-automations-poll-event');

const {anyContentVersion, anyEtag, anyErrorId} = matchers;
const {cacheInvalidateHeaderNotSet} = assertions;

describe('Automations API', function () {
    let agent;
    let schedulerIntegration;
    let schedulerToken;

    before(async function () {
        agent = await agentProvider.getAdminAPIAgent();
        await fixtureManager.init('integrations', 'api_keys');

        schedulerIntegration = await models.Integration.findOne(
            {slug: 'ghost-scheduler'},
            {withRelated: 'api_keys'}
        );

        schedulerToken = getSignedAdminToken({
            publishedAt: new Date().toISOString(),
            apiUrl: '/admin/',
            integration: schedulerIntegration.toJSON()
        });
    });

    afterEach(function () {
        sinon.restore();
    });

    describe('poll', function () {
        /** @type {sinon.SinonStub} */
        let dispatchStub;

        beforeEach(function () {
            dispatchStub = sinon.stub(domainEvents, 'dispatch');
        });

        it('does not poll when request lacks a token', async function () {
            await agent
                .put('automations/poll/')
                .expectStatus(401)
                .expect(cacheInvalidateHeaderNotSet())
                .matchHeaderSnapshot({
                    'content-version': anyContentVersion,
                    etag: anyEtag
                })
                .matchBodySnapshot({
                    errors: [{
                        id: anyErrorId,
                        message: 'Invalid token: No token found in URL'
                    }]
                });

            sinon.assert.notCalled(dispatchStub);
        });

        it('does not poll when request token is invalid', async function () {
            const invalidSchedulerToken = getSignedAdminToken({
                publishedAt: new Date().toISOString(),
                apiUrl: '/members/',
                integration: schedulerIntegration.toJSON()
            });

            await agent
                .put(`automations/poll/?token=${invalidSchedulerToken}`)
                .expectStatus(401)
                .expect(cacheInvalidateHeaderNotSet())
                .matchHeaderSnapshot({
                    'content-version': anyContentVersion,
                    etag: anyEtag
                })
                .matchBodySnapshot({
                    errors: [{
                        id: anyErrorId
                    }]
                });

            sinon.assert.notCalled(dispatchStub);
        });

        it('triggers a poll with a valid scheduler integration token', async function () {
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
});
