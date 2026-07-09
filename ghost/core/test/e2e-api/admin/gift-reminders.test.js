const assert = require('node:assert/strict');
const sinon = require('sinon');
const models = require('../../../core/server/models');
const {getSignedAdminToken} = require('../../../core/server/adapters/scheduling/utils');
const {agentProvider, fixtureManager, matchers, assertions} = require('../../utils/e2e-framework');
const jobQueue = require('../../../core/server/services/jobs/queue').default;

const {anyContentVersion, anyEtag, anyErrorId} = matchers;
const {cacheInvalidateHeaderNotSet} = assertions;

describe('Gift Reminders API', function () {
    let agent;
    let schedulerKey;
    let schedulerToken;

    beforeAll(async function () {
        agent = await agentProvider.getAdminAPIAgent();
        await fixtureManager.init('integrations', 'api_keys');

        schedulerKey = await models.Integration.getApiKeyBySlug('ghost-scheduler', 'admin');

        schedulerToken = getSignedAdminToken({
            publishedAt: new Date().toISOString(),
            apiUrl: '/admin/',
            key: schedulerKey
        });
    });

    afterEach(function () {
        sinon.restore();
    });

    describe('flushReminders', function () {
        /** @type {sinon.SinonStub} */
        let dispatchStub;

        beforeEach(function () {
            dispatchStub = sinon.stub(jobQueue, 'dispatch');
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
                key: schedulerKey
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

        it('dispatches a reminder flush job with a valid scheduler integration token', async function () {
            await agent
                .put(`gifts/flush_reminders/?token=${schedulerToken}`)
                .expectStatus(204)
                .expectEmptyBody()
                .expect(cacheInvalidateHeaderNotSet())
                .matchHeaderSnapshot({
                    'content-version': anyContentVersion,
                    etag: anyEtag
                });

            sinon.assert.calledOnce(dispatchStub);
            assert.equal(dispatchStub.firstCall.args[0].constructor.type, 'send-gift-reminders');
        });
    });
});
