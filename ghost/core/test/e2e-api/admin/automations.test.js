const sinon = require('sinon');
const domainEvents = require('@tryghost/domain-events');
const models = require('../../../core/server/models');
const {getSignedAdminToken} = require('../../../core/server/adapters/scheduling/utils');
const {agentProvider, fixtureManager, matchers, assertions} = require('../../utils/e2e-framework');
const StartAutomationsPollEvent = require('../../../core/server/services/automations/events/start-automations-poll-event');

const {anyContentVersion, anyEtag, anyErrorId, anyISODateTime, anyObjectId} = matchers;
const {cacheInvalidateHeaderNotSet} = assertions;

const matchAutomationSummary = () => ({
    id: anyObjectId,
    created_at: anyISODateTime,
    updated_at: anyISODateTime
});

const matchAutomation = () => ({
    ...matchAutomationSummary(),
    actions: [{
        id: anyObjectId
    }, {
        id: anyObjectId,
        data: {
            email_design_setting_id: anyObjectId
        }
    }, {
        id: anyObjectId
    }, {
        id: anyObjectId,
        data: {
            email_design_setting_id: anyObjectId
        }
    }],
    edges: Array.from({length: 3}, () => ({
        source_action_id: anyObjectId,
        target_action_id: anyObjectId
    }))
});

const matchPagination = () => ({
    page: 1,
    pages: 1,
    limit: 'all',
    total: 2,
    prev: null,
    next: null
});

describe('Automations API', function () {
    let agent;
    let schedulerIntegration;
    let schedulerToken;

    before(async function () {
        agent = await agentProvider.getAdminAPIAgent();
        await fixtureManager.init('users', 'integrations', 'api_keys');
        await agent.loginAsOwner();

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

    describe('browse', function () {
        it('returns automations sourced from the temporary fake database', async function () {
            await agent
                .get('automations')
                .expectStatus(200)
                .expect(cacheInvalidateHeaderNotSet())
                .matchBodySnapshot({
                    automations: [
                        matchAutomationSummary(),
                        matchAutomationSummary()
                    ],
                    meta: {
                        pagination: matchPagination()
                    }
                })
                .matchHeaderSnapshot({
                    'content-version': anyContentVersion,
                    etag: anyEtag
                });
        });
    });

    describe('read', function () {
        it('returns the automation, ordered actions, and edges sourced from the temporary fake database', async function () {
            const {body: browseBody} = await agent
                .get('automations')
                .expectStatus(200);

            await agent
                .get(`automations/${browseBody.automations[0].id}`)
                .expectStatus(200)
                .expect(cacheInvalidateHeaderNotSet())
                .matchBodySnapshot({
                    automations: [matchAutomation()]
                })
                .matchHeaderSnapshot({
                    'content-version': anyContentVersion,
                    etag: anyEtag
                });
        });
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
