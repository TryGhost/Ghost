const sinon = require('sinon');
const domainEvents = require('@tryghost/domain-events');
const assert = require('node:assert/strict');
const models = require('../../../core/server/models');
const {getSignedAdminToken} = require('../../../core/server/adapters/scheduling/utils');
const {agentProvider, dbUtils, fixtureManager, matchers, assertions} = require('../../utils/e2e-framework');
const StartAutomationsPollEvent = require('../../../core/server/services/welcome-email-automations/events/start-automations-poll-event');

const {anyContentVersion, anyEtag, anyErrorId} = matchers;
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
        beforeEach(async function () {
            await dbUtils.truncate('welcome_email_automated_emails');
            await dbUtils.truncate('welcome_email_automations');
        });

        it('returns welcome email automations ordered by creation time', async function () {
            const second = await models.WelcomeEmailAutomation.add({
                name: 'Welcome Email (Premium)',
                slug: 'member-welcome-email-premium',
                status: 'inactive',
                created_at: new Date('2025-01-02T00:00:00Z')
            });
            const first = await models.WelcomeEmailAutomation.add({
                name: 'Welcome Email (Free)',
                slug: 'member-welcome-email-free',
                status: 'active',
                created_at: new Date('2025-01-01T00:00:00Z')
            });

            const {body} = await agent
                .get('automations')
                .expectStatus(200);

            assert.deepEqual(body.automations, [{
                id: first.id,
                name: first.get('name'),
                status: first.get('status')
            }, {
                id: second.id,
                name: second.get('name'),
                status: second.get('status')
            }]);
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
