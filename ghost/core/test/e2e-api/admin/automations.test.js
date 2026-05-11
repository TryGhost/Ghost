const sinon = require('sinon');
const domainEvents = require('@tryghost/domain-events');
const assert = require('node:assert/strict');
const models = require('../../../core/server/models');
const {getSignedAdminToken} = require('../../../core/server/adapters/scheduling/utils');
const {agentProvider, fixtureManager, matchers, assertions} = require('../../utils/e2e-framework');
const StartAutomationsPollEvent = require('../../../core/server/services/automations/events/start-automations-poll-event');

const {anyContentVersion, anyEtag, anyErrorId, anyObjectId} = matchers;
const {cacheInvalidateHeaderNotSet} = assertions;

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
            const {body} = await agent
                .get('automations')
                .expectStatus(200);

            assert.deepEqual(body.automations, [{
                id: '670000000000000000000001',
                name: 'Welcome Email (Free)',
                slug: 'member-welcome-email-free',
                status: 'active'
            }, {
                id: '670000000000000000000002',
                name: 'Welcome Email (Paid)',
                slug: 'member-welcome-email-paid',
                status: 'active'
            }]);
        });
    });

    describe('read', function () {
        it('returns the automation, ordered actions, and edges sourced from the temporary fake database', async function () {
            await agent
                .get('automations/670000000000000000000001')
                .expectStatus(200)
                .expect(cacheInvalidateHeaderNotSet())
                .matchBodySnapshot({
                    automations: [{
                        actions: [{}, {
                            data: {
                                email_design_setting_id: anyObjectId
                            }
                        }, {}, {
                            data: {
                                email_design_setting_id: anyObjectId
                            }
                        }]
                    }]
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
