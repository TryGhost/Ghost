const sinon = require('sinon');
const domainEvents = require('@tryghost/domain-events');
const models = require('../../../core/server/models');
const {getSignedAdminToken} = require('../../../core/server/adapters/scheduling/utils');
const {agentProvider, fixtureManager, matchers, assertions} = require('../../utils/e2e-framework');
const StartGiftReminderFlushEvent = require('../../../core/server/services/gifts/events/start-gift-reminder-flush-event');

const {anyContentVersion, anyEtag, anyErrorId} = matchers;
const {cacheInvalidateHeaderNotSet} = assertions;

describe('Gift Reminders API', function () {
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

    describe('flushReminders', function () {
        /** @type {sinon.SinonStub} */
        let dispatchStub;

        beforeEach(function () {
            dispatchStub = sinon.stub(domainEvents, 'dispatch');
        });

        it('does not flush when request lacks a token', async function () {
            await agent
                .put('gifts/flush_reminders/')
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

        it('does not flush when request token is invalid', async function () {
            const invalidSchedulerToken = getSignedAdminToken({
                publishedAt: new Date().toISOString(),
                apiUrl: '/members/',
                integration: schedulerIntegration.toJSON()
            });

            await agent
                .put(`gifts/flush_reminders/?token=${invalidSchedulerToken}`)
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

        it('dispatches a flush event with a valid scheduler integration token', async function () {
            await agent
                .put(`gifts/flush_reminders/?token=${schedulerToken}`)
                .expectStatus(204)
                .expectEmptyBody()
                .expect(cacheInvalidateHeaderNotSet())
                .matchHeaderSnapshot({
                    'content-version': anyContentVersion,
                    etag: anyEtag
                });

            sinon.assert.calledOnceWithExactly(
                dispatchStub,
                sinon.match.instanceOf(StartGiftReminderFlushEvent)
            );
        });
    });
});
