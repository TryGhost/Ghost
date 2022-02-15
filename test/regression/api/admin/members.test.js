const assert = require('assert');
const nock = require('nock');
const {agentProvider, mockManager, fixtureManager, matchers} = require('../../../utils/e2e-framework');
const {anyString, anyArray, anyObjectId, anyEtag, anyUuid, anyErrorId, anyDate} = matchers;

let agent;

const memberMatcherNoIncludes = {
    id: anyObjectId,
    uuid: anyUuid,
    created_at: anyDate,
    updated_at: anyDate
};

const memberMatcherShallowIncludes = {
    id: anyObjectId,
    uuid: anyUuid,
    created_at: anyDate,
    updated_at: anyDate,
    subscriptions: anyArray,
    labels: anyArray
};

describe('Members API without Stripe', function () {
    before(async function () {
        agent = await agentProvider.getAdminAPIAgent();
        await fixtureManager.init('members');
        await agent.loginAsOwner();
    });

    beforeEach(async function () {
        mockManager.mockLabsEnabled('members');
        mockManager.mockMail();
    });

    afterEach(async function () {
        mockManager.restore();
    });

    it('Add should fail when comped flag is passed in but Stripe is not enabled', async function () {
        const newMember = {
            email: 'memberTestAdd@test.com',
            comped: true
        };

        await agent
            .post(`members/`)
            .body({members: [newMember]})
            .expectStatus(422)
            .matchHeaderSnapshot({
                etag: anyEtag
            })
            .matchBodySnapshot({
                errors: [{
                    id: anyErrorId
                }]
            });
    });
});

describe('Members API with Stripe', function () {
    before(async function () {
        mockManager.setupStripe();
        agent = await agentProvider.getAdminAPIAgent();
        await fixtureManager.init('members');
        await agent.loginAsOwner();
    });

    beforeEach(async function () {
        mockManager.mockLabsEnabled('members');
        mockManager.mockMail();
        mockManager.mockStripe();
    });

    afterEach(async function () {
        mockManager.restore();
    });

    it('Can add and send a signup confirmation email', async function () {
        const member = {
            name: 'Send Me Confirmation',
            email: 'member_getting_confirmation@test.com',
            subscribed: true
        };

        const queryParams = {
            send_email: true,
            email_type: 'signup'
        };

        const {body} = await agent
            .post('/members/?send_email=true&email_type=signup')
            .body({members: [member]})
            .expectStatus(201)
            .matchBodySnapshot({
                members: [memberMatcherNoIncludes]
            })
            .matchHeaderSnapshot({
                etag: anyEtag,
                location: anyString
            });

        mockManager.assert.sentEmail({
            subject: '🙌 Complete your sign up to Ghost!',
            to: 'member_getting_confirmation@test.com'
        });

        // @TODO: do we really need to delete this member here?
        await agent
            .delete(`members/${body.members[0].id}/`)
            .matchHeaderSnapshot({
                etag: anyEtag
            })
            .expectStatus(204);
    });

    it('Can order by email_open_rate', async function () {
        await agent
            .get('members/?order=email_open_rate%20desc')
            .expectStatus(200)
            .matchHeaderSnapshot({
                etag: anyEtag
            })
            .matchBodySnapshot({
                members: new Array(8).fill(memberMatcherShallowIncludes)
            })
            .expect(({body}) => {
                const {members} = body;
                assert.equal(members[0].email_open_rate > members[1].email_open_rate, true, 'Expected the first member to have a greater open rate than the second.');
            });

        await agent
            .get('members/?order=email_open_rate%20asc')
            .expectStatus(200)
            .matchHeaderSnapshot({
                etag: anyEtag
            })
            .matchBodySnapshot({
                members: new Array(8).fill(memberMatcherShallowIncludes)
            })
            .expect(({body}) => {
                const {members} = body;
                assert.equal(members[0].email_open_rate < members[1].email_open_rate, true, 'Expected the first member to have a smaller open rate than the second.');
            });
    });

    it('Sarch by case-insensitive name egg receives member with name Mr Egg', async function () {
        await agent
            .get('members/?search=egg')
            .expectStatus(200)
            .matchBodySnapshot({
                members: [memberMatcherShallowIncludes]
            })
            .matchHeaderSnapshot({
                etag: anyEtag
            });
    });

    it('Search by case-insensitive email MEMBER2 receives member with email member2@test.com', async function () {
        await agent
            .get('members/?search=MEMBER2')
            .expectStatus(200)
            .matchBodySnapshot({
                members: [memberMatcherShallowIncludes]
            })
            .matchHeaderSnapshot({
                etag: anyEtag
            });
    });

    it('Sarch for paid members retrieves member with email paid@test.com', async function () {
        await agent
            .get('members/?search=egon&paid=true')
            .expectStatus(200)
            .matchBodySnapshot({
                members: [memberMatcherShallowIncludes]
            })
            .matchHeaderSnapshot({
                etag: anyEtag
            });
    });

    it('Search for non existing member returns empty result set', async function () {
        await agent
            .get('members/?search=do_not_exist')
            .expectStatus(200)
            .matchHeaderSnapshot({
                etag: anyEtag
            })
            .matchBodySnapshot({
                members: []
            });
    });

    it('Can update a member with subscription included, change name to "Updated name"', async function () {
        const memberChanged = {
            name: 'Updated name'
        };

        const paidMember = fixtureManager.get('members', 2);

        await agent
            .put(`members/${paidMember.id}/`)
            .body({members: [memberChanged]})
            .expectStatus(200)
            .matchHeaderSnapshot({
                etag: anyEtag
            })
            .matchBodySnapshot({
                members: [memberMatcherShallowIncludes]
            });
    });

    it('Add should fail when passing incorrect email_type query parameter', async function () {
        const newMember = {
            name: 'test',
            email: 'memberTestAdd@test.com'
        };

        await agent
            .post(`members/?send_email=true&email_type=lel`)
            .body({members: [newMember]})
            .expectStatus(422)
            .matchHeaderSnapshot({
                etag: anyEtag
            })
            .matchBodySnapshot({
                errors: [{
                    id: anyErrorId
                }]
            });
    });

    it.only('Can delete a member without cancelling Stripe Subscription', async function () {
        let subscriptionCanceled = false;
        nock('https://api.stripe.com')
            .persist()
            .delete(/v1\/.*/)
            .reply((uri) => {
                const [match, resource, id] = uri.match(/\/?v1\/(\w+)\/?(\w+)/) || [null];

                if (match && resource === 'subscriptions') {
                    subscriptionCanceled = true;
                    return [200, {
                        id,
                        status: 'canceled'
                    }];
                }

                return [500];
            });

        // TODO This is wrong because it changes the state for teh rest of the tests
        // We need to add a member via a fixture and then remove them OR work out how
        // to reapply fixtures before each test
        const memberToDelete = fixtureManager.get('members', 2);

        await agent
            .delete(`members/${memberToDelete.id}/`)
            .expectStatus(204)
            .matchHeaderSnapshot({
                etag: anyEtag
            })
            .matchBodySnapshot();

        assert.equal(subscriptionCanceled, false, 'expected subscription not to be canceled');
    });

    it('Errors when fetching stats with unknown days param value', async function () {
        await agent
            .get('members/stats/?days=nope')
            .expectStatus(422)
            .matchHeaderSnapshot({
                etag: anyEtag
            })
            .matchBodySnapshot({
                errors: [{
                    id: anyErrorId
                }]
            });
    });
});
