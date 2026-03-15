const {assertArrayMatchesWithoutOrder} = require('../../utils/assertions');
const {agentProvider, mockManager, fixtureManager} = require('../../utils/e2e-framework');
const models = require('../../../core/server/models');
const assert = require('node:assert/strict');
const sinon = require('sinon');
const members = require('../../../core/server/services/members');

let membersAgent, membersService;

async function assertMemberEvents({eventType, memberId, asserts}) {
    const events = await models[eventType].where('member_id', memberId).fetchAll();
    const eventsJSON = events.map(e => e.toJSON());
    assertArrayMatchesWithoutOrder(eventsJSON, asserts);
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
            .expectHeader('Location', /\/welcome-free\/\?success=true&action=signup$/)
            .expectHeader('Set-Cookie', /members-ssr.*/);
    });

    it('Will redirect to the paid welcome page for signup-paid', async function () {
        const magicLink = await membersService.api.getMagicLink('paid@test.com', 'signup');
        const magicLinkUrl = new URL(magicLink);
        const token = magicLinkUrl.searchParams.get('token');

        await membersAgent.get(`/?token=${token}&action=signup-paid`)
            .expectStatus(302)
            .expectHeader('Location', /\/welcome-paid\/\?success=true&action=signup$/)
            .expectHeader('Set-Cookie', /members-ssr.*/);
    });

    it('Will redirect to the free welcome page for subscribe', async function () {
        const magicLink = await membersService.api.getMagicLink('member1@test.com', 'signup');
        const magicLinkUrl = new URL(magicLink);
        const token = magicLinkUrl.searchParams.get('token');

        await membersAgent.get(`/?token=${token}&action=subscribe`)
            .expectStatus(302)
            .expectHeader('Location', /\/welcome-free\/\?success=true&action=signup$/)
            .expectHeader('Set-Cookie', /members-ssr.*/);
    });

    it('Will redirect to an external welcome page for subscribe', async function () {
        // Alter the product welcome page to an external URL
        const freeProduct = await members.api.productRepository.get({slug: 'free'});
        await members.api.productRepository.update({
            id: freeProduct.id,
            welcome_page_url: 'https://externalsite.ghost/welcome/'
        });

        try {
            const magicLink = await membersService.api.getMagicLink('member1@test.com', 'signup');
            const magicLinkUrl = new URL(magicLink);
            const token = magicLinkUrl.searchParams.get('token');

            await membersAgent.get(`/?token=${token}&action=subscribe`)
                .expectStatus(302)
                .expectHeader('Location', 'https://externalsite.ghost/welcome/') // no query params added
                .expectHeader('Set-Cookie', /members-ssr.*/);
        } finally {
            // Change it back
            await members.api.productRepository.update({
                id: freeProduct.id,
                welcome_page_url: freeProduct.get('welcome_page_url')
            });
        }
    });

    it('Will create a new member on signup', async function () {
        const email = 'not-existent-member@test.com';
        const magicLink = await membersService.api.getMagicLink(email, 'signup');
        const magicLinkUrl = new URL(magicLink);
        const token = magicLinkUrl.searchParams.get('token');

        await membersAgent.get(`/?token=${token}&action=signup`)
            .expectStatus(302)
            .expectHeader('Location', /\/welcome-free\/\?success=true&action=signup$/)
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
            .expectHeader('Location', /\/welcome-free\/\?success=true&action=signup$/)
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

    it('Stores UTM parameters in MemberCreatedEvent', async function () {
        const email = 'member-with-utm@test.com';
        const attribution = {
            id: null,
            url: null,
            type: null,
            referrerSource: 'Google',
            referrerMedium: 'unknown',
            referrerUrl: null,
            utmSource: 'newsletter',
            utmMedium: 'email',
            utmCampaign: 'spring_sale',
            utmTerm: 'ghost_pro',
            utmContent: 'header_link'
        };

        const magicLink = await membersService.api.getMagicLink(email, 'signup', {attribution});
        const magicLinkUrl = new URL(magicLink);
        const token = magicLinkUrl.searchParams.get('token');

        await membersAgent.get(`/?token=${token}&action=signup`)
            .expectStatus(302)
            .expectHeader('Location', /\/welcome-free\/\?success=true&action=signup$/)
            .expectHeader('Set-Cookie', /members-ssr.*/);

        const member = await getMemberByEmail(email);

        // Check event created with UTM parameters
        await assertMemberEvents({
            eventType: 'MemberCreatedEvent',
            memberId: member.id,
            asserts: [
                {
                    created_at: member.get('created_at'),
                    attribution_url: null,
                    attribution_id: null,
                    attribution_type: null,
                    source: 'member',
                    referrer_source: 'Google',
                    referrer_medium: 'unknown',
                    referrer_url: null,
                    utm_source: 'newsletter',
                    utm_medium: 'email',
                    utm_campaign: 'spring_sale',
                    utm_term: 'ghost_pro',
                    utm_content: 'header_link'
                }
            ]
        });
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
                .expectHeader('Location', /\/welcome-free\/\?success=true&action=signup$/)
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
                .expectHeader('Location', /\/welcome-free\/\?success=true&action=signup$/)
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
                .expectHeader('Location', /\/welcome-free\/\?success=true&action=signup$/)
                .expectHeader('Set-Cookie', /members-ssr.*/);

            await membersAgent.get(`/?token=${token}&action=signup`)
                .expectStatus(302)
                .expectHeader('Location', /\/welcome-free\/\?success=true&action=signup$/)
                .expectHeader('Set-Cookie', /members-ssr.*/);

            await membersAgent.get(`/?token=${token}&action=signup`)
                .expectStatus(302)
                .expectHeader('Location', /\/welcome-free\/\?success=true&action=signup$/)
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
                .expectHeader('Location', /\/welcome-free\/\?success=true&action=signup$/)
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
