const {agentProvider, mockManager, fixtureManager, configUtils, resetRateLimits, dbUtils} = require('../../utils/e2e-framework');
const models = require('../../../core/server/models');
const assert = require('assert/strict');
require('should');
const sinon = require('sinon');

let membersAgent, membersService;

async function assertMemberEvents({eventType, memberId, asserts}) {
    const events = await models[eventType].where('member_id', memberId).fetchAll();
    const eventsJSON = events.map(e => e.toJSON());

    // Order shouldn't matter here
    for (const a of asserts) {
        eventsJSON.should.matchAny(a);
    }
    assert.equal(events.length, asserts.length, `Only ${asserts.length} ${eventType} should have been added.`);
}

async function getMemberByEmail(email, require = true) {
    // eslint-disable-next-line dot-notation
    return await models['Member'].where('email', email).fetch({require});
}

describe('Members Signin', function () {
    before(async function () {
        const agents = await agentProvider.getAgentsForMembers();
        membersAgent = agents.membersAgent;

        membersService = require('../../../core/server/services/members');

        await fixtureManager.init('members');
    });

    beforeEach(function () {
        mockManager.mockMail();
    });

    afterEach(function () {
        mockManager.restore();
    });

    it('Will not set a cookie if the token is invalid', async function () {
        await membersAgent.get('/?token=blah')
            .expectStatus(302)
            .expectHeader('Location', /\?\w*success=false/);
    });

    it('Will set a cookie if the token is valid', async function () {
        const magicLink = await membersService.api.getMagicLink('member1@test.com', 'signup');
        const magicLinkUrl = new URL(magicLink);
        const token = magicLinkUrl.searchParams.get('token');

        await membersAgent.get(`/?token=${token}`)
            .expectStatus(302)
            .expectHeader('Location', /\?\w*success=true/)
            .expectHeader('Set-Cookie', /members-ssr.*/);
    });

    it('Will redirect to the free welcome page for signup', async function () {
        const magicLink = await membersService.api.getMagicLink('member1@test.com', 'signup');
        const magicLinkUrl = new URL(magicLink);
        const token = magicLinkUrl.searchParams.get('token');

        await membersAgent.get(`/?token=${token}&action=signup`)
            .expectStatus(302)
            .expectHeader('Location', /\/welcome-free\/$/)
            .expectHeader('Set-Cookie', /members-ssr.*/);
    });

    it('Will redirect to the paid welcome page for signup-paid', async function () {
        const magicLink = await membersService.api.getMagicLink('paid@test.com', 'signup');
        const magicLinkUrl = new URL(magicLink);
        const token = magicLinkUrl.searchParams.get('token');

        await membersAgent.get(`/?token=${token}&action=signup-paid`)
            .expectStatus(302)
            .expectHeader('Location', /\/welcome-paid\/$/)
            .expectHeader('Set-Cookie', /members-ssr.*/);
    });

    it('Will redirect to the free welcome page for subscribe', async function () {
        const magicLink = await membersService.api.getMagicLink('member1@test.com', 'signup');
        const magicLinkUrl = new URL(magicLink);
        const token = magicLinkUrl.searchParams.get('token');

        await membersAgent.get(`/?token=${token}&action=subscribe`)
            .expectStatus(302)
            .expectHeader('Location', /\/welcome-free\/$/)
            .expectHeader('Set-Cookie', /members-ssr.*/);
    });

    it('Will create a new member on signup', async function () {
        const email = 'not-existent-member@test.com';
        const magicLink = await membersService.api.getMagicLink(email, 'signup');
        const magicLinkUrl = new URL(magicLink);
        const token = magicLinkUrl.searchParams.get('token');

        await membersAgent.get(`/?token=${token}&action=signup`)
            .expectStatus(302)
            .expectHeader('Location', /\/welcome-free\/$/)
            .expectHeader('Set-Cookie', /members-ssr.*/);

        const member = await getMemberByEmail(email);

        // Check event created
        await assertMemberEvents({
            eventType: 'MemberCreatedEvent',
            memberId: member.id,
            asserts: [
                {
                    created_at: member.get('created_at'),
                    attribution_url: null,
                    attribution_id: null,
                    attribution_type: null,
                    source: 'member'
                }
            ]
        });
    });

    it('Allows a signin via a signup link', async function () {
        // This member should be created by the previous test
        const email = 'not-existent-member@test.com';

        const magicLink = await membersService.api.getMagicLink(email, 'signup');
        const magicLinkUrl = new URL(magicLink);
        const token = magicLinkUrl.searchParams.get('token');

        await membersAgent.get(`/?token=${token}&action=signup`)
            .expectStatus(302)
            .expectHeader('Location', /\/welcome-free\/$/)
            .expectHeader('Set-Cookie', /members-ssr.*/);
    });

    it('Will not create a new member on signin', async function () {
        const email = 'not-existent-member-2@test.com';
        const magicLink = await membersService.api.getMagicLink(email, 'signin');
        const magicLinkUrl = new URL(magicLink);
        const token = magicLinkUrl.searchParams.get('token');

        // Note: we deliberately set the wrong action here, because this action should be ignored by the backend
        // and only used by the frontend.
        await membersAgent.get(`/?token=${token}&action=signup`)
            .expectStatus(302)
            .expectHeader('Location', /success=false/);

        const member = await getMemberByEmail(email, false);
        assert(!member, 'Member should not have been created');
    });

    describe('Validity Period', function () {
        let clock;
        let startDate = new Date();
        const email = 'validity-period-member1@test.com';

        beforeEach(async function () {
            // Remove ms precision (not supported by MySQL)
            startDate.setMilliseconds(0);

            clock = sinon.useFakeTimers(startDate);
        });

        afterEach(function () {
            clock.restore();
        });

        it('Expires a token after 10 minutes of first usage', async function () {
            const magicLink = await membersService.api.getMagicLink(email, 'signup');
            const magicLinkUrl = new URL(magicLink);
            const token = magicLinkUrl.searchParams.get('token');

            // Use a first time
            await membersAgent.get(`/?token=${token}&action=signup`)
                .expectStatus(302)
                .expectHeader('Location', /\/welcome-free\/$/)
                .expectHeader('Set-Cookie', /members-ssr.*/);

            // Fetch token in the database
            const model = await models.SingleUseToken.findOne({token});
            assert(!!model, 'Token should exist in the database');

            assert.equal(model.get('used_count'), 1, 'used_count should be 1');
            assert.equal(model.get('first_used_at').getTime(), startDate.getTime(), 'first_used_at should be set after first usage');
            assert.equal(model.get('updated_at').getTime(), startDate.getTime(), 'updated_at should be set on changes');

            // Use a second time, after 5 minutes
            clock.tick(5 * 60 * 1000);

            await membersAgent.get(`/?token=${token}&action=signup`)
                .expectStatus(302)
                .expectHeader('Location', /\/welcome-free\/$/)
                .expectHeader('Set-Cookie', /members-ssr.*/);

            await model.refresh();

            assert.equal(model.get('used_count'), 2, 'used_count should be 2');

            // Not changed
            assert.equal(model.get('first_used_at').getTime(), startDate.getTime(), 'first_used_at should not be changed on second usage');

            // Updated at should be changed
            assert.equal(model.get('updated_at').getTime(), new Date().getTime(), 'updated_at should be set on changes');
            const lastChangedAt = new Date();

            // Wait another 6 minutes, and the usage of the token should be blocked now
            clock.tick(6 * 60 * 1000);

            await membersAgent.get('/?token=blah')
                .expectStatus(302)
                .expectHeader('Location', /\?\w*success=false/);

            // No changes expected
            await model.refresh();

            assert.equal(model.get('used_count'), 2, 'used_count should not be changed');
            assert.equal(model.get('first_used_at').getTime(), startDate.getTime(), 'first_used_at should not be changed');
            assert.equal(model.get('updated_at').getTime(), lastChangedAt.getTime(), 'updated_at should not be changed');
        });

        it('Expires a token after 3 uses', async function () {
            const magicLink = await membersService.api.getMagicLink(email, 'signup');
            const magicLinkUrl = new URL(magicLink);
            const token = magicLinkUrl.searchParams.get('token');

            // Use a first time
            await membersAgent.get(`/?token=${token}&action=signup`)
                .expectStatus(302)
                .expectHeader('Location', /\/welcome-free\/$/)
                .expectHeader('Set-Cookie', /members-ssr.*/);

            await membersAgent.get(`/?token=${token}&action=signup`)
                .expectStatus(302)
                .expectHeader('Location', /\/welcome-free\/$/)
                .expectHeader('Set-Cookie', /members-ssr.*/);

            await membersAgent.get(`/?token=${token}&action=signup`)
                .expectStatus(302)
                .expectHeader('Location', /\/welcome-free\/$/)
                .expectHeader('Set-Cookie', /members-ssr.*/);

            // Fetch token in the database
            const model = await models.SingleUseToken.findOne({token});
            assert(!!model, 'Token should exist in the database');

            assert.equal(model.get('used_count'), 3, 'used_count should be 3');
            assert.equal(model.get('first_used_at').getTime(), startDate.getTime(), 'first_used_at should be set after first usage');
            assert.equal(model.get('updated_at').getTime(), startDate.getTime(), 'updated_at should be set on changes');

            // Failed 4th usage
            await membersAgent.get('/?token=blah')
                .expectStatus(302)
                .expectHeader('Location', /\?\w*success=false/);

            // No changes expected
            await model.refresh();

            assert.equal(model.get('used_count'), 3, 'used_count should be 3');
            assert.equal(model.get('first_used_at').getTime(), startDate.getTime(), 'first_used_at should be set after first usage');
            assert.equal(model.get('updated_at').getTime(), startDate.getTime(), 'updated_at should be set on changes');
        });

        it('Expires a token after 24 hours if never used', async function () {
            const magicLink = await membersService.api.getMagicLink(email, 'signup');
            const magicLinkUrl = new URL(magicLink);
            const token = magicLinkUrl.searchParams.get('token');

            // Wait 24 hours
            clock.tick(24 * 60 * 60 * 1000);

            await membersAgent.get('/?token=blah')
                .expectStatus(302)
                .expectHeader('Location', /\?\w*success=false/);

            // No changes expected
            const model = await models.SingleUseToken.findOne({token});
            assert(!!model, 'Token should exist in the database');

            assert.equal(model.get('used_count'), 0, 'used_count should be 0');
            assert.equal(model.get('first_used_at'), null, 'first_used_at should not be set');
            assert.equal(model.get('updated_at').getTime(), startDate.getTime(), 'updated_at should not be set');
        });
    });

    describe('Rate limiting', function () {
        let clock;

        beforeEach(async function () {
            await dbUtils.truncate('brute');
            await resetRateLimits();
            clock = sinon.useFakeTimers(new Date());
        });

        afterEach(function () {
            clock.restore();
        });

        it('Will rate limit member enumeration', async function () {
            // +1 because this is a retry count, so we have one request + the retries, then blocked
            const userLoginRateLimit = configUtils.config.get('spam').member_login.freeRetries + 1;

            for (let i = 0; i < userLoginRateLimit; i++) {
                await membersAgent.post('/api/send-magic-link')
                    .body({
                        email: 'rate-limiting-test-' + i + '@test.com',
                        emailType: 'signup'
                    })
                    .expectStatus(201);
            }

            // Now we've been rate limited for every email
            await membersAgent.post('/api/send-magic-link')
                .body({
                    email: 'other@test.com',
                    emailType: 'signup'
                })
                .expectStatus(429);

            // Now we've been rate limited
            await membersAgent.post('/api/send-magic-link')
                .body({
                    email: 'one@test.com',
                    emailType: 'signup'
                })
                .expectStatus(429);

            // Get one of the magic link emails
            const mail = mockManager.assert.sentEmail({
                to: 'rate-limiting-test-0@test.com',
                subject: /Complete your sign up to Ghost!/
            });

            // Get link from email
            const [url] = mail.text.match(/https?:\/\/[^\s]+/);

            const magicLink = new URL(url);

            // Login works, but we're still rate limited (otherwise this would be an easy escape to allow user enumeration)
            await membersAgent.get(magicLink.pathname + magicLink.search);

            // We are still rate limited
            await membersAgent.post('/api/send-magic-link')
                .body({
                    email: 'any@test.com',
                    emailType: 'signup'
                })
                .expectStatus(429);

            // Wait 10 minutes and check if we are still rate limited
            clock.tick(10 * 60 * 1000);

            // We should be able to send a new email
            await membersAgent.post('/api/send-magic-link')
                .body({
                    email: 'any@test.com',
                    emailType: 'signup'
                })
                .expectStatus(201);

            // But only once
            await membersAgent.post('/api/send-magic-link')
                .body({
                    email: 'any2@test.com',
                    emailType: 'signup'
                })
                .expectStatus(429);

            // Waiting 10 minutes is still enough (fibonacci)
            clock.tick(10 * 60 * 1000);

            await membersAgent.post('/api/send-magic-link')
                .body({
                    email: 'any2@test.com',
                    emailType: 'signup'
                })
                .expectStatus(201);

            // Blocked again
            await membersAgent.post('/api/send-magic-link')
                .body({
                    email: 'any3@test.com',
                    emailType: 'signup'
                })
                .expectStatus(429);

            // Waiting 10 minutes is not enough any longer
            clock.tick(10 * 60 * 1000);

            await membersAgent.post('/api/send-magic-link')
                .body({
                    email: 'any3@test.com',
                    emailType: 'signup'
                })
                .expectStatus(429);

            // Waiting 20 minutes is enough
            clock.tick(10 * 60 * 1000);

            await membersAgent.post('/api/send-magic-link')
                .body({
                    email: 'any2@test.com',
                    emailType: 'signup'
                })
                .expectStatus(201);

            // Blocked again
            await membersAgent.post('/api/send-magic-link')
                .body({
                    email: 'any3@test.com',
                    emailType: 'signup'
                })
                .expectStatus(429);

            // Waiting 12 hours is enough to reset it completely
            clock.tick(12 * 60 * 60 * 1000 + 1000);

            // We can try multiple times again
            await membersAgent.post('/api/send-magic-link')
                .body({
                    email: 'any4@test.com',
                    emailType: 'signup'
                })
                .expectStatus(201);

            // Blocked again
            await membersAgent.post('/api/send-magic-link')
                .body({
                    email: 'any5@test.com',
                    emailType: 'signup'
                })
                .expectStatus(201);
        });

        it('Will clear rate limits for members auth', async function () {
            // Temporary increase the member_login rate limits to a higher number
            // because other wise we would hit user enumeration rate limits (this won't get reset after a succeeded login)
            // We need to do this here otherwise the middlewares are not setup correctly
            configUtils.set('spam:member_login:freeRetries', 40);

            // We need to reset spam instances to apply the configuration change
            await resetRateLimits();

            // +1 because this is a retry count, so we have one request + the retries, then blocked
            const userLoginRateLimit = configUtils.config.get('spam').user_login.freeRetries + 1;

            for (let i = 0; i < userLoginRateLimit; i++) {
                await membersAgent.post('/api/send-magic-link')
                    .body({
                        email: 'rate-limiting-test-1@test.com',
                        emailType: 'signup'
                    })
                    .expectStatus(201);

                await membersAgent.post('/api/send-magic-link')
                    .body({
                        email: 'rate-limiting-test-2@test.com',
                        emailType: 'signup'
                    })
                    .expectStatus(201);
            }

            // Now we've been rate limited
            await membersAgent.post('/api/send-magic-link')
                .body({
                    email: 'rate-limiting-test-1@test.com',
                    emailType: 'signup'
                })
                .expectStatus(429);

            // Now we've been rate limited
            await membersAgent.post('/api/send-magic-link')
                .body({
                    email: 'rate-limiting-test-2@test.com',
                    emailType: 'signup'
                })
                .expectStatus(429);

            // Get one of the magic link emails
            const mail = mockManager.assert.sentEmail({
                to: 'rate-limiting-test-1@test.com',
                subject: /Complete your sign up to Ghost!/
            });

            // Get link from email
            const [url] = mail.text.match(/https?:\/\/[^\s]+/);

            const magicLink = new URL(url);

            // Login
            await membersAgent.get(magicLink.pathname + magicLink.search);

            // The first member has been un ratelimited
            await membersAgent.post('/api/send-magic-link')
                .body({
                    email: 'rate-limiting-test-1@test.com',
                    emailType: 'signup'
                })
                .expectEmptyBody()
                .expectStatus(201);

            // The second is still rate limited
            await membersAgent.post('/api/send-magic-link')
                .body({
                    email: 'rate-limiting-test-2@test.com',
                    emailType: 'signup'
                })
                .expectStatus(429);

            // Wait 10 minutes and check if we are still rate limited
            clock.tick(10 * 60 * 1000);

            // We should be able to send a new email
            await membersAgent.post('/api/send-magic-link')
                .body({
                    email: 'rate-limiting-test-2@test.com',
                    emailType: 'signup'
                })
                .expectStatus(201);
        });
    });

    describe('Member attribution', function () {
        it('Will create a member attribution if magic link contains an attribution source', async function () {
            const email = 'non-existent-member@test.com';
            const magicLink = await membersService.api.getMagicLink(email, 'signup', {
                attribution: {
                    id: 'test_source_id',
                    url: '/test-source-url/',
                    type: 'post'
                }
            });
            const magicLinkUrl = new URL(magicLink);
            const token = magicLinkUrl.searchParams.get('token');

            await membersAgent.get(`/?token=${token}&action=signup`)
                .expectStatus(302)
                .expectHeader('Location', /\/welcome-free\/$/)
                .expectHeader('Set-Cookie', /members-ssr.*/);

            const member = await getMemberByEmail(email);

            // Check event created
            await assertMemberEvents({
                eventType: 'MemberCreatedEvent',
                memberId: member.id,
                asserts: [
                    {
                        created_at: member.get('created_at'),
                        attribution_id: 'test_source_id',
                        attribution_url: '/test-source-url/',
                        attribution_type: 'post',
                        source: 'member'
                    }
                ]
            });
        });
    });
});
