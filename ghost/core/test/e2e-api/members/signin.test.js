const {agentProvider, mockManager, fixtureManager} = require('../../utils/e2e-framework');
const models = require('../../../core/server/models');
const assert = require('assert');
require('should');
const labsService = require('../../../core/shared/labs');

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

async function getMemberByEmail(email) {
    // eslint-disable-next-line dot-notation
    return await models['Member'].where('email', email).fetch({require: true});
}

describe('Members Signin', function () {
    before(async function () {
        const agents = await agentProvider.getAgentsForMembers();
        membersAgent = agents.membersAgent;

        membersService = require('../../../core/server/services/members');

        await fixtureManager.init('members');
    });

    beforeEach(function () {
        mockManager.mockStripe();
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
        const magicLink = await membersService.api.getMagicLink('member1@test.com');
        const magicLinkUrl = new URL(magicLink);
        const token = magicLinkUrl.searchParams.get('token');

        await membersAgent.get(`/?token=${token}`)
            .expectStatus(302)
            .expectHeader('Location', /\?\w*success=true/)
            .expectHeader('Set-Cookie', /members-ssr.*/);
    });

    it('Will redirect to the free welcome page for signup', async function () {
        const magicLink = await membersService.api.getMagicLink('member1@test.com');
        const magicLinkUrl = new URL(magicLink);
        const token = magicLinkUrl.searchParams.get('token');

        await membersAgent.get(`/?token=${token}&action=signup`)
            .expectStatus(302)
            .expectHeader('Location', /\/welcome-free\/$/)
            .expectHeader('Set-Cookie', /members-ssr.*/);
    });

    it('Will redirect to the paid welcome page for signup-paid', async function () {
        const magicLink = await membersService.api.getMagicLink('paid@test.com');
        const magicLinkUrl = new URL(magicLink);
        const token = magicLinkUrl.searchParams.get('token');

        await membersAgent.get(`/?token=${token}&action=signup-paid`)
            .expectStatus(302)
            .expectHeader('Location', /\/welcome-paid\/$/)
            .expectHeader('Set-Cookie', /members-ssr.*/);
    });

    it('Will redirect to the free welcome page for subscribe', async function () {
        const magicLink = await membersService.api.getMagicLink('member1@test.com');
        const magicLinkUrl = new URL(magicLink);
        const token = magicLinkUrl.searchParams.get('token');

        await membersAgent.get(`/?token=${token}&action=subscribe`)
            .expectStatus(302)
            .expectHeader('Location', /\/welcome-free\/$/)
            .expectHeader('Set-Cookie', /members-ssr.*/);
    });

    it('Will create a new member on signup', async function () {
        const email = 'not-existent-member@test.com';
        const magicLink = await membersService.api.getMagicLink(email);
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

    describe('Member attribution', function () {
        it('Will create a member attribution if magic link contains an attribution source', async function () {
            const email = 'non-existent-member@test.com';
            const magicLink = await membersService.api.getMagicLink(email, {
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
