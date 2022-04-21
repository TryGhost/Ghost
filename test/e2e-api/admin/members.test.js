const {agentProvider, mockManager, fixtureManager, matchers} = require('../../utils/e2e-framework');
const {anyEtag, anyObjectId, anyUuid, anyISODateTime, anyISODate, anyString, anyArray, anyLocationFor, anyErrorId} = matchers;

const assert = require('assert');
const nock = require('nock');
const should = require('should');
const sinon = require('sinon');
const testUtils = require('../../utils');
const Papa = require('papaparse');

const models = require('../../../core/server/models');
const {Product} = require('../../../core/server/models/product');

async function assertMemberEvents({eventType, memberId, asserts}) {
    const events = await models[eventType].where('member_id', memberId).fetchAll();
    events.map(e => e.toJSON()).should.match(asserts);
    assert.equal(events.length, asserts.length, `Only ${asserts.length} ${eventType} should have been added.`);
}

async function assertSubscription(subscriptionId, asserts) {
    // eslint-disable-next-line dot-notation
    const subscription = await models['StripeCustomerSubscription'].where('subscription_id', subscriptionId).fetch({require: true});

    // We use the native toJSON to prevent calling the overriden serialize method
    models.Base.Model.prototype.serialize.call(subscription).should.match(asserts);
}

async function getPaidProduct() {
    return await Product.findOne({type: 'paid'});
}

const memberMatcherNoIncludes = {
    id: anyObjectId,
    uuid: anyUuid,
    created_at: anyISODateTime,
    updated_at: anyISODateTime
};

const memberMatcherShallowIncludes = {
    id: anyObjectId,
    uuid: anyUuid,
    created_at: anyISODateTime,
    updated_at: anyISODateTime,
    subscriptions: anyArray,
    labels: anyArray
};

const memberMatcherShallowIncludesForNewsletters = {
    id: anyObjectId,
    uuid: anyUuid,
    created_at: anyISODateTime,
    updated_at: anyISODateTime,
    subscriptions: anyArray,
    labels: anyArray,
    newsletters: anyArray
};

let agent;

describe('Members API without Stripe', function () {
    before(async function () {
        agent = await agentProvider.getAdminAPIAgent();
        await fixtureManager.init();
        await agent.loginAsOwner();
    });

    before(async function () {
        await agent
            .delete('/settings/stripe/connect/')
            .expectStatus(200);
    });

    beforeEach(function () {
        mockManager.mockMail();
    });

    afterEach(function () {
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

describe('Members API', function () {
    before(async function () {
        agent = await agentProvider.getAdminAPIAgent();
        await fixtureManager.init('members');
        await agent.loginAsOwner();
    });

    beforeEach(function () {
        mockManager.mockLabsEnabled('multipleProducts');
        mockManager.mockStripe();
        mockManager.mockMail();
    });

    afterEach(function () {
        mockManager.restore();
    });

    // List Members

    it('Can browse', async function () {
        await agent
            .get('/members/')
            .expectStatus(200)
            .matchBodySnapshot({
                members: new Array(8).fill(memberMatcherShallowIncludes)
            })
            .matchHeaderSnapshot({
                etag: anyEtag
            });
    });

    it('Can browse with filter', async function () {
        await agent
            .get('/members/?filter=label:label-1')
            .expectStatus(200)
            .matchBodySnapshot({
                members: new Array(1).fill(memberMatcherShallowIncludes)
            })
            .matchHeaderSnapshot({
                etag: anyEtag
            });
    });

    it('Can browse with search', async function () {
        await agent
            .get('/members/?search=member1')
            .expectStatus(200)
            .matchBodySnapshot({
                members: new Array(1).fill(memberMatcherShallowIncludes)
            })
            .matchHeaderSnapshot({
                etag: anyEtag
            });
    });

    it('Can filter by paid status', async function () {
        await agent
            .get('/members/?filter=status:paid')
            .expectStatus(200)
            .matchBodySnapshot({
                members: new Array(5).fill(memberMatcherShallowIncludes)
            })
            .matchHeaderSnapshot({
                etag: anyEtag
            });
    });

    it('Can filter using contains operators', async function () {
        await agent
            .get(`/members/?filter=name:~'Venkman'`)
            .expectStatus(200)
            .matchBodySnapshot({
                members: new Array(1).fill(memberMatcherShallowIncludes)
            })
            .matchHeaderSnapshot({
                etag: anyEtag
            });
    });

    it('Can ignore any unknown includes', async function () {
        await agent
            .get('/members/?filter=status:paid&include=emailRecipients')
            .expectStatus(200)
            .matchBodySnapshot({
                members: new Array(5).fill(memberMatcherShallowIncludes)
            })
            .matchHeaderSnapshot({
                etag: anyEtag
            });
    });

    it('Can order by email_open_rate', async function () {
        await agent
            .get('members/?order=email_open_rate%20desc')
            .expectStatus(200)
            .matchHeaderSnapshot({
                etag: anyEtag,
                'content-length': anyString
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
                etag: anyEtag,
                'content-length': anyString
            })
            .matchBodySnapshot({
                members: new Array(8).fill(memberMatcherShallowIncludes)
            })
            .expect(({body}) => {
                const {members} = body;
                assert.equal(members[0].email_open_rate < members[1].email_open_rate, true, 'Expected the first member to have a smaller open rate than the second.');
            });
    });

    it('Search by case-insensitive name egg receives member with name Mr Egg', async function () {
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

    it('Search for paid members retrieves member with email paid@test.com', async function () {
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

    // Read a member

    it('Can read', async function () {
        await agent
            .get(`/members/${testUtils.DataGenerator.Content.members[0].id}/`)
            .expectStatus(200)
            .matchBodySnapshot({
                members: new Array(1).fill(memberMatcherShallowIncludes)
            })
            .matchHeaderSnapshot({
                etag: anyEtag
            });
    });

    it('Can read and include email_recipients', async function () {
        await agent
            .get(`/members/${testUtils.DataGenerator.Content.members[0].id}/?include=email_recipients`)
            .expectStatus(200)
            .matchBodySnapshot({
                members: new Array(1).fill(memberMatcherShallowIncludes)
            })
            .matchHeaderSnapshot({
                etag: anyEtag
            });
    });

    // Create a member

    it('Can add', async function () {
        const member = {
            name: 'test',
            email: 'memberTestAdd@test.com',
            note: 'test note',
            subscribed: false,
            labels: ['test-label']
        };

        const {body} = await agent
            .post(`/members/`)
            .body({members: [member]})
            .expectStatus(201)
            .matchBodySnapshot({
                members: new Array(1).fill(memberMatcherShallowIncludes)
            })
            .matchHeaderSnapshot({
                etag: anyEtag,
                location: anyLocationFor('members')
            });
        const newMember = body.members[0];

        await agent
            .post(`/members/`)
            .body({members: [member]})
            .expectStatus(422);

        await assertMemberEvents({
            eventType: 'MemberStatusEvent',
            memberId: newMember.id,
            asserts: [
                {
                    from_status: null,
                    to_status: 'free'
                }
            ]
        });
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

        const newMember = body.members[0];

        mockManager.assert.sentEmail({
            subject: '🙌 Complete your sign up to Ghost!',
            to: 'member_getting_confirmation@test.com'
        });

        await assertMemberEvents({
            eventType: 'MemberStatusEvent',
            memberId: newMember.id,
            asserts: [
                {
                    from_status: null,
                    to_status: 'free'
                }
            ]
        });

        await assertMemberEvents({
            eventType: 'MemberSubscribeEvent',
            memberId: newMember.id,
            asserts: [
                {
                    subscribed: true,
                    source: 'admin'
                }
            ]
        });

        // @TODO: do we really need to delete this member here?
        await agent
            .delete(`members/${body.members[0].id}/`)
            .matchHeaderSnapshot({
                etag: anyEtag
            })
            .expectStatus(204);

        const events = await models.MemberSubscribeEvent.findAll();
        assert.equal(events.models.length, 0, 'There should be no MemberSubscribeEvent remaining.');
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

        const statusEvents = await models.MemberStatusEvent.findAll();
        assert.equal(statusEvents.models.length, 1, 'No MemberStatusEvent should have been added after failing to create a subscription.');
    });

    // Edit a member

    it('Can add complimentary subscription (out of date)', async function () {
        const stripeService = require('../../../core/server/services/stripe');
        const fakePrice = {
            id: 'price_1',
            product: '',
            active: true,
            nickname: 'Complimentary',
            unit_amount: 0,
            currency: 'usd',
            type: 'recurring',
            recurring: {
                interval: 'year'
            }
        };
        const fakeSubscription = {
            id: 'sub_1',
            customer: 'cus_1',
            status: 'active',
            cancel_at_period_end: false,
            metadata: {},
            current_period_end: Date.now() / 1000,
            start_date: Date.now() / 1000,
            plan: fakePrice,
            items: {
                data: [{
                    price: fakePrice
                }]
            }
        };
        sinon.stub(stripeService.api, 'createCustomer').callsFake(async function (data) {
            return {
                id: 'cus_1',
                email: data.email
            };
        });
        sinon.stub(stripeService.api, 'createPrice').resolves(fakePrice);
        sinon.stub(stripeService.api, 'createSubscription').resolves(fakeSubscription);
        sinon.stub(stripeService.api, 'getSubscription').resolves(fakeSubscription);
        const initialMember = {
            name: 'Name',
            email: 'compedtest@test.com',
            subscribed: true
        };

        const compedPayload = {
            comped: true
        };

        const {body} = await agent
            .post(`/members/`)
            .body({members: [initialMember]})
            .expectStatus(201)
            .matchBodySnapshot({
                members: new Array(1).fill(memberMatcherShallowIncludes)
            })
            .matchHeaderSnapshot({
                etag: anyEtag,
                location: anyLocationFor('members')
            });

        const newMember = body.members[0];

        const {body: body2} = await agent
            .put(`/members/${newMember.id}/`)
            .body({members: [compedPayload]})
            .expectStatus(200)
            .matchBodySnapshot({
                members: new Array(1).fill(memberMatcherShallowIncludes)
            })
            .matchHeaderSnapshot({
                etag: anyEtag
            });

        await assertMemberEvents({
            eventType: 'MemberStatusEvent',
            memberId: newMember.id,
            asserts: [{
                from_status: null,
                to_status: 'free'
            }]
        });

        await assertMemberEvents({
            eventType: 'MemberSubscribeEvent',
            memberId: newMember.id,
            asserts: [{
                subscribed: true,
                source: 'admin'
            }]
        });
    });

    it('Can add complimentary subscription by assigning a product to a member', async function () {
        const initialMember = {
            name: 'Name',
            email: 'compedtest2@test.com',
            subscribed: true
        };

        const {body} = await agent
            .post(`/members/`)
            .body({members: [initialMember]})
            .expectStatus(201);

        const newMember = body.members[0];
        assert.equal(newMember.status, 'free', 'A new member should have the free status');

        const product = await getPaidProduct();

        const compedPayload = {
            id: newMember.id,
            email: newMember.email,
            products: [
                {
                    id: product.id
                }
            ]
        };

        const {body: body2} = await agent
            .put(`/members/${newMember.id}/`)
            .body({members: [compedPayload]})
            .expectStatus(200);

        const updatedMember = body2.members[0];
        assert.equal(updatedMember.status, 'comped', 'A comped member should have the comped status');
        assert.equal(updatedMember.products.length, 1, 'The member should have one product');

        await assertMemberEvents({
            eventType: 'MemberStatusEvent',
            memberId: newMember.id,
            asserts: [
                {
                    from_status: null,
                    to_status: 'free'
                },
                {
                    from_status: 'free',
                    to_status: 'comped'
                }
            ]
        });

        await assertMemberEvents({
            eventType: 'MemberSubscribeEvent',
            memberId: newMember.id,
            asserts: [{
                subscribed: true,
                source: 'admin'
            }]
        });

        await assertMemberEvents({
            eventType: 'MemberPaidSubscriptionEvent',
            memberId: newMember.id,
            asserts: []
        });
    });

    it('Can end a complimentary subscription by removing a product from a member', async function () {
        const product = await getPaidProduct();
        const initialMember = {
            name: 'Name',
            email: 'compedtest3@test.com',
            subscribed: true,
            products: [
                {
                    id: product.id
                }
            ]
        };

        const {body} = await agent
            .post(`/members/`)
            .body({members: [initialMember]})
            .expectStatus(201);

        const newMember = body.members[0];
        assert.equal(newMember.status, 'comped', 'The new member should have the comped status');
        assert.equal(newMember.products.length, 1, 'The member should have 1 product');

        // Remove it
        const removePayload = {
            id: newMember.id,
            email: newMember.email,
            products: []
        };

        const {body: body2} = await agent
            .put(`/members/${newMember.id}/`)
            .body({members: [removePayload]})
            .expectStatus(200);

        const updatedMember = body2.members[0];
        assert.equal(updatedMember.status, 'free', 'The member should have the free status');
        assert.equal(updatedMember.products.length, 0, 'The member should have 0 products');

        await assertMemberEvents({
            eventType: 'MemberStatusEvent',
            memberId: newMember.id,
            asserts: [
                {
                    from_status: null,
                    to_status: 'comped'
                },
                {
                    from_status: 'comped',
                    to_status: 'free'
                }
            ]
        });

        await assertMemberEvents({
            eventType: 'MemberSubscribeEvent',
            memberId: newMember.id,
            asserts: [
                {
                    subscribed: true,
                    source: 'admin'
                }
            ]
        });

        await assertMemberEvents({
            eventType: 'MemberPaidSubscriptionEvent',
            memberId: newMember.id,
            asserts: []
        });
    });

    it('Can create a new member with a product (complementary)', async function () {
        const product = await getPaidProduct();
        const initialMember = {
            name: 'Name',
            email: 'compedtest4@test.com',
            subscribed: true,
            products: [
                {
                    id: product.id
                }
            ]
        };

        const {body} = await agent
            .post(`/members/`)
            .body({members: [initialMember]})
            .expectStatus(201)
            .matchBodySnapshot({
                members: new Array(1).fill({
                    id: anyObjectId,
                    uuid: anyUuid,
                    created_at: anyISODateTime,
                    updated_at: anyISODateTime,
                    labels: anyArray,
                    subscriptions: anyArray,
                    products: new Array(1).fill({
                        id: anyObjectId,
                        monthly_price_id: anyObjectId,
                        yearly_price_id: anyObjectId,
                        created_at: anyISODateTime,
                        updated_at: anyISODateTime
                    })
                })
            })
            .matchHeaderSnapshot({
                etag: anyEtag,
                location: anyLocationFor('members')
            });

        const newMember = body.members[0];
        assert.equal(newMember.status, 'comped', 'The newly imported member should have the comped status');

        await assertMemberEvents({
            eventType: 'MemberStatusEvent',
            memberId: newMember.id,
            asserts: [{
                from_status: null,
                to_status: 'comped'
            }]
        });

        await assertMemberEvents({
            eventType: 'MemberSubscribeEvent',
            memberId: newMember.id,
            asserts: [{
                subscribed: true,
                source: 'admin'
            }]
        });

        await assertMemberEvents({
            eventType: 'MemberPaidSubscriptionEvent',
            memberId: newMember.id,
            asserts: []
        });
    });

    it('Can create a member with an existing complimentary subscription', async function () {
        const fakePrice = {
            id: 'price_1',
            product: '',
            active: true,
            nickname: 'Complimentary',
            unit_amount: 0,
            currency: 'usd',
            type: 'recurring',
            recurring: {
                interval: 'year'
            }
        };

        const fakeSubscription = {
            id: 'sub_1',
            customer: 'cus_1234',
            status: 'active',
            cancel_at_period_end: false,
            metadata: {},
            current_period_end: Date.now() / 1000 + 1000,
            start_date: Date.now() / 1000,
            plan: fakePrice,
            items: {
                data: [{
                    price: fakePrice
                }]
            }
        };

        const fakeCustomer = {
            id: 'cus_1234',
            name: 'Test Member',
            email: 'create-member-comped-test@email.com',
            subscriptions: {
                type: 'list',
                data: [fakeSubscription]
            }
        };
        nock('https://api.stripe.com')
            .persist()
            .get(/v1\/.*/)
            .reply((uri, body) => {
                const [match, resource, id] = uri.match(/\/?v1\/(\w+)\/?(\w+)/) || [null];

                if (!match) {
                    return [500];
                }

                if (resource === 'customers') {
                    return [200, fakeCustomer];
                }

                if (resource === 'subscriptions') {
                    return [200, fakeSubscription];
                }
            });

        const initialMember = {
            name: fakeCustomer.name,
            email: fakeCustomer.email,
            subscribed: true,
            stripe_customer_id: fakeCustomer.id
        };

        const {body} = await agent
            .post(`/members/`)
            .body({members: [initialMember]})
            .expectStatus(201)
            .matchBodySnapshot({
                members: new Array(1).fill({
                    id: anyObjectId,
                    uuid: anyUuid,
                    created_at: anyISODateTime,
                    updated_at: anyISODateTime,
                    labels: anyArray,
                    subscriptions: anyArray,
                    products: anyArray
                })
            })
            .matchHeaderSnapshot({
                etag: anyEtag,
                location: anyLocationFor('members')
            });

        const newMember = body.members[0];
        assert.equal(newMember.status, 'comped', 'The created member should have the comped status');

        await assertMemberEvents({
            eventType: 'MemberStatusEvent',
            memberId: newMember.id,
            asserts: [
                {
                    from_status: null,
                    to_status: 'free'
                },
                {
                    from_status: 'free',
                    to_status: 'comped'
                }
            ]
        });

        await assertMemberEvents({
            eventType: 'MemberSubscribeEvent',
            memberId: newMember.id,
            asserts: [
                {
                    subscribed: true,
                    source: 'admin'
                }
            ]
        });

        await assertMemberEvents({
            eventType: 'MemberPaidSubscriptionEvent',
            memberId: newMember.id,
            asserts: [{
                mrr_delta: 0
            }]
        });
    });

    let memberWithPaidSubscription;

    it('Can create a member with an existing paid subscription', async function () {
        const fakePrice = {
            id: 'price_1',
            product: 'product_1234',
            active: true,
            nickname: 'Paid',
            unit_amount: 1200,
            currency: 'usd',
            type: 'recurring',
            recurring: {
                interval: 'year'
            }
        };

        const fakeSubscription = {
            id: 'sub_987623',
            customer: 'cus_12345',
            status: 'active',
            cancel_at_period_end: false,
            metadata: {},
            current_period_end: Date.now() / 1000 + 1000,
            start_date: Date.now() / 1000,
            plan: fakePrice,
            items: {
                data: [{
                    id: 'item_123',
                    price: fakePrice
                }]
            }
        };

        const fakeCustomer = {
            id: 'cus_12345',
            name: 'Test Member',
            email: 'create-member-paid-test@email.com',
            subscriptions: {
                type: 'list',
                data: [fakeSubscription]
            }
        };
        nock('https://api.stripe.com')
            .persist()
            .get(/v1\/.*/)
            .reply((uri, body) => {
                const [match, resource, id] = uri.match(/\/?v1\/(\w+)\/?(\w+)/) || [null];

                if (!match) {
                    return [500];
                }

                if (resource === 'customers') {
                    return [200, fakeCustomer];
                }

                if (resource === 'subscriptions') {
                    return [200, fakeSubscription];
                }
            });

        const initialMember = {
            name: fakeCustomer.name,
            email: fakeCustomer.email,
            subscribed: true,
            stripe_customer_id: fakeCustomer.id
        };

        const {body} = await agent
            .post(`/members/`)
            .body({members: [initialMember]})
            .expectStatus(201)
            .matchBodySnapshot({
                members: new Array(1).fill({
                    id: anyObjectId,
                    uuid: anyUuid,
                    created_at: anyISODateTime,
                    updated_at: anyISODateTime,
                    labels: anyArray,
                    subscriptions: anyArray,
                    products: anyArray
                })
            })
            .matchHeaderSnapshot({
                etag: anyEtag,
                location: anyLocationFor('members')
            });

        const newMember = body.members[0];

        assert.equal(newMember.status, 'paid', 'The created member should have the paid status');
        assert.equal(newMember.subscriptions.length, 1, 'The member should have a single subscription');
        assert.equal(newMember.subscriptions[0].id, fakeSubscription.id, 'The returned subscription should have an ID assigned');

        await assertMemberEvents({
            eventType: 'MemberStatusEvent',
            memberId: newMember.id,
            asserts: [
                {
                    from_status: null,
                    to_status: 'free'
                }, {
                    from_status: 'free',
                    to_status: 'paid'
                }
            ]
        });

        await assertMemberEvents({
            eventType: 'MemberSubscribeEvent',
            memberId: newMember.id,
            asserts: [{
                subscribed: true,
                source: 'admin'
            }]
        });

        await assertMemberEvents({
            eventType: 'MemberPaidSubscriptionEvent',
            memberId: newMember.id,
            asserts: [
                {
                    mrr_delta: 100
                }
            ]
        });

        await assertSubscription(fakeSubscription.id, {
            subscription_id: fakeSubscription.id,
            status: 'active',
            cancel_at_period_end: false,
            plan_amount: 1200,
            plan_interval: 'year',
            plan_currency: 'usd',
            mrr: 100
        });

        // Save this member for the next test
        memberWithPaidSubscription = newMember;
    });

    it('Returns an identical member format for read, edit and browse', async function () {
        if (!memberWithPaidSubscription) {
            // Previous test failed
            this.skip();
        }

        // Check status has been updated to 'free' after cancelling
        const {body: readBody} = await agent.get('/members/' + memberWithPaidSubscription.id + '/');
        assert.equal(readBody.members.length, 1, 'The member was not found in read');
        const readMember = readBody.members[0];

        // Note that we explicitly need to ask to include products while browsing
        const {body: browseBody} = await agent.get(`/members/?search=${memberWithPaidSubscription.email}&include=products`);
        assert.equal(browseBody.members.length, 1, 'The member was not found in browse');
        const browseMember = browseBody.members[0];

        // Check for this member with a paid subscription that the body results for the patch, get and browse endpoints are 100% identical
        should.deepEqual(browseMember, readMember, 'Browsing a member returns a different format than reading a member');
        should.deepEqual(memberWithPaidSubscription, readMember, 'Editing a member returns a different format than reading a member');
    });

    it('Can edit by id', async function () {
        const memberToChange = {
            name: 'change me',
            email: 'member2Change@test.com',
            note: 'initial note',
            subscribed: true
        };

        const memberChanged = {
            name: 'changed',
            email: 'cantChangeMe@test.com',
            note: 'edited note',
            subscribed: false
        };

        const {body} = await agent
            .post(`/members/`)
            .body({members: [memberToChange]})
            .expectStatus(201)
            .matchBodySnapshot({
                members: new Array(1).fill(memberMatcherShallowIncludes)
            })
            .matchHeaderSnapshot({
                etag: anyEtag,
                location: anyLocationFor('members')
            });
        const newMember = body.members[0];

        await assertMemberEvents({
            eventType: 'MemberSubscribeEvent',
            memberId: newMember.id,
            asserts: [{
                subscribed: true,
                source: 'admin'
            }]
        });
        await assertMemberEvents({
            eventType: 'MemberStatusEvent',
            memberId: newMember.id,
            asserts: [{
                from_status: null,
                to_status: 'free'
            }]
        });

        await agent
            .put(`/members/${newMember.id}/`)
            .body({members: [memberChanged]})
            .expectStatus(200)
            .matchBodySnapshot({
                members: new Array(1).fill(memberMatcherShallowIncludes)
            })
            .matchHeaderSnapshot({
                etag: anyEtag
            });

        await assertMemberEvents({
            eventType: 'MemberEmailChangeEvent',
            memberId: newMember.id,
            asserts: [{
                from_email: memberToChange.email,
                to_email: memberChanged.email
            }]
        });
        await assertMemberEvents({
            eventType: 'MemberSubscribeEvent',
            memberId: newMember.id,
            asserts: [
                {
                    subscribed: true,
                    source: 'admin'
                }, {
                    subscribed: false,
                    source: 'admin'
                }
            ]
        });
    });

    it('Can add a subscription', async function () {
        const memberId = testUtils.DataGenerator.Content.members[0].id;
        const price = testUtils.DataGenerator.Content.stripe_prices[0];

        function nockCallback(method, uri, body) {
            const [match, resource, id] = uri.match(/\/?v1\/(\w+)(?:\/(\w+))?/) || [null];

            if (!match) {
                return [500];
            }

            if (resource === 'customers') {
                return [200, {id: 'cus_123', email: 'member1@test.com'}];
            }

            if (resource === 'subscriptions') {
                const now = Math.floor(Date.now() / 1000);
                return [200, {id: 'sub_123', customer: 'cus_123', cancel_at_period_end: false, items: {
                    data: [{price: {
                        id: price.stripe_price_id,
                        recurring: {
                            interval: price.interval
                        },
                        unit_amount: price.amount,
                        currency: price.currency.toLowerCase()
                    }}]
                }, status: 'active', current_period_end: now + 24 * 3600, start_date: now}];
            }
        }

        nock('https://api.stripe.com:443')
            .persist()
            .post(/v1\/.*/)
            .reply((uri, body) => nockCallback('POST', uri, body));

        nock('https://api.stripe.com:443')
            .persist()
            .get(/v1\/.*/)
            .reply((uri, body) => nockCallback('GET', uri, body));

        await agent
            .post(`/members/${memberId}/subscriptions/`)
            .body({
                stripe_price_id: price.id
            })
            .expectStatus(200)
            .matchBodySnapshot({
                members: new Array(1).fill({
                    id: anyObjectId,
                    uuid: anyUuid,
                    created_at: anyISODateTime,
                    updated_at: anyISODateTime,
                    labels: anyArray,
                    subscriptions: [{
                        start_date: anyString,
                        current_period_end: anyString,
                        price: {
                            price_id: anyObjectId,
                            product: {
                                product_id: anyObjectId
                            }
                        }
                    }]
                })
            })
            .matchHeaderSnapshot({
                etag: anyEtag
            });

        // Check member read with a subscription
        await agent
            .get(`/members/${memberId}/`)
            .expectStatus(200)
            .matchBodySnapshot({
                members: new Array(1).fill({
                    id: anyObjectId,
                    uuid: anyUuid,
                    created_at: anyISODateTime,
                    updated_at: anyISODateTime,
                    labels: anyArray,
                    subscriptions: [{
                        start_date: anyString,
                        current_period_end: anyString,
                        price: {
                            price_id: anyObjectId,
                            product: {
                                product_id: anyObjectId
                            }
                        }
                    }]
                })
            })
            .matchHeaderSnapshot({
                etag: anyEtag
            });
    });

    // Delete a member

    it('Can destroy', async function () {
        const member = {
            name: 'test',
            email: 'memberTestDestroy@test.com'
        };

        const {body} = await agent
            .post(`/members/`)
            .body({members: [member]})
            .expectStatus(201)
            .matchBodySnapshot({
                members: new Array(1).fill(memberMatcherShallowIncludes)
            })
            .matchHeaderSnapshot({
                etag: anyEtag,
                location: anyLocationFor('members')
            });

        const newMember = body.members[0];

        await agent
            .delete(`/members/${newMember.id}`)
            .expectStatus(204)
            .expectEmptyBody()
            .matchHeaderSnapshot({
                etag: anyEtag
            });

        await agent
            .get(`/members/${newMember.id}/`)
            .expectStatus(404)
            .matchBodySnapshot({
                errors: [{
                    id: anyUuid
                }]
            })
            .matchHeaderSnapshot({
                etag: anyEtag
            });
    });

    it('Can delete a member without cancelling Stripe Subscription', async function () {
        let subscriptionCanceled = false;
        nock('https://api.stripe.com')
            .persist()
            .delete(/v1\/.*/)
            .reply((uri) => {
                const [match, resource, id] = uri.match(/\/?v1\/(\w+)(?:\/(\w+))/) || [null];

                if (match && resource === 'subscriptions') {
                    subscriptionCanceled = true;
                    return [200, {
                        id,
                        status: 'canceled'
                    }];
                }

                return [500];
            });

        // @TODO This is wrong because it changes the state for the rest of the tests
        // We need to add a member via a fixture and then remove them OR work out how
        // to reapply fixtures before each test
        const memberToDelete = fixtureManager.get('members', 2);

        await agent
            .delete(`members/${memberToDelete.id}/`)
            .expectStatus(204)
            .expectEmptyBody()
            .matchHeaderSnapshot({
                etag: anyEtag
            });

        assert.equal(subscriptionCanceled, false, 'expected subscription not to be canceled');
    });

    // Export members to CSV

    it('Can export CSV', async function () {
        const res = await agent
            .get(`/members/upload/`)
            .expectStatus(200)
            .expectEmptyBody() // express-test body parsing doesn't support CSV
            .matchHeaderSnapshot({
                etag: anyEtag,
                'content-length': anyString, //For some reason the content-length changes between 1220 and 1317
                'content-disposition': anyString
            });

        res.text.should.match(/id,email,name,note,subscribed_to_emails,complimentary_plan,stripe_customer_id,created_at,deleted_at/);

        const csv = Papa.parse(res.text, {header: true});
        should.exist(csv.data.find(row => row.name === 'Mr Egg'));
        should.exist(csv.data.find(row => row.name === 'Winston Zeddemore'));
        should.exist(csv.data.find(row => row.name === 'Ray Stantz'));
        should.exist(csv.data.find(row => row.email === 'member2@test.com'));
    });

    it('Can export a filtered CSV', async function () {
        const res = await agent
            .get(`/members/upload/?search=Egg`)
            .expectStatus(200)
            .expectEmptyBody() // express-test body parsing doesn't support CSV
            .matchHeaderSnapshot({
                etag: anyEtag,
                'content-disposition': anyString
            });

        res.text.should.match(/id,email,name,note,subscribed_to_emails,complimentary_plan,stripe_customer_id,created_at,deleted_at/);

        const csv = Papa.parse(res.text, {header: true});
        should.exist(csv.data.find(row => row.name === 'Mr Egg'));
        should.not.exist(csv.data.find(row => row.name === 'Egon Spengler'));
        should.not.exist(csv.data.find(row => row.name === 'Ray Stantz'));
        should.not.exist(csv.data.find(row => row.email === 'member2@test.com'));
    });

    // Get stats

    it('Can fetch member counts stats', async function () {
        await agent
            .get(`/members/stats/count/`)
            .expectStatus(200)
            .matchBodySnapshot({
                data: [{
                    date: anyISODate
                }]
            })
            .matchHeaderSnapshot({
                etag: anyEtag
            });
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

describe('Members API: with multiple newsletters', function () {
    before(async function () {
        agent = await agentProvider.getAdminAPIAgent();
        await fixtureManager.init('members', 'newsletters');
        await agent.loginAsOwner();
    });

    beforeEach(function () {
        mockManager.mockLabsEnabled('multipleNewsletters');
        mockManager.mockStripe();
        mockManager.mockMail();
    });

    afterEach(function () {
        mockManager.restore();
    });

    // List Members

    it('Can browse', async function () {
        await agent
            .get('/members/')
            .expectStatus(200)
            .matchBodySnapshot({
                members: new Array(8).fill(memberMatcherShallowIncludesForNewsletters)
            })
            .matchHeaderSnapshot({
                etag: anyEtag
            });
    });

    // Read a member

    it('Can read', async function () {
        await agent
            .get(`/members/${testUtils.DataGenerator.Content.members[0].id}/`)
            .expectStatus(200)
            .matchBodySnapshot({
                members: new Array(1).fill(memberMatcherShallowIncludesForNewsletters)
            })
            .matchHeaderSnapshot({
                etag: anyEtag
            });
    });

    // Create a member
    it('Can add with default newsletters', async function () {
        const member = {
            name: 'test',
            email: 'memberTestNewsletterAdd@test.com',
            note: 'test note',
            subscribed: false,
            labels: ['test-label']
        };

        await agent
            .post(`/members/`)
            .body({members: [member]})
            .expectStatus(201)
            .matchBodySnapshot({
                members: [{
                    id: anyObjectId,
                    uuid: anyUuid,
                    created_at: anyISODateTime,
                    updated_at: anyISODateTime,
                    subscriptions: anyArray,
                    labels: anyArray,
                    newsletters: Array(2).fill({
                        id: matchers.anyObjectId
                    })
                }]
            })
            .matchHeaderSnapshot({
                etag: anyEtag,
                location: anyLocationFor('members')
            });
    });

    it('Can filter on newsletter slug', async function () {
        await agent
            .get('/members/?filter=newsletters:weekly-newsletter')
            .expectStatus(200)
            .matchBodySnapshot({
                members: new Array(1).fill(memberMatcherShallowIncludesForNewsletters)
            })
            .matchHeaderSnapshot({
                etag: anyEtag
            });
    });

    // Edit a member
    it('Can add and edit with custom newsletters', async function () {
        // Add custom newsletter list to new member
        const member = {
            name: 'test newsletter',
            email: 'memberTestAddNewsletter2@test.com',
            note: 'test note',
            subscribed: false,
            labels: ['test-label'],
            newsletters: [{id: testUtils.DataGenerator.Content.newsletters[1].id}]
        };

        const {body} = await agent
            .post(`/members/`)
            .body({members: [member]})
            .expectStatus(201)
            .matchBodySnapshot({
                members: [{
                    id: anyObjectId,
                    uuid: anyUuid,
                    created_at: anyISODateTime,
                    updated_at: anyISODateTime,
                    subscriptions: anyArray,
                    labels: anyArray,
                    newsletters: Array(1).fill({
                        id: matchers.anyObjectId
                    })
                }]
            })
            .matchHeaderSnapshot({
                etag: anyEtag,
                location: anyLocationFor('members')
            });

        const memberId = body.members[0].id;
        const editedMember = {
            newsletters: [{id: testUtils.DataGenerator.Content.newsletters[0].id}]
        };

        // Edit newsletter list for member
        await agent
            .put(`/members/${memberId}`)
            .body({members: [editedMember]})
            .expectStatus(200)
            .matchBodySnapshot({
                members: [{
                    id: anyObjectId,
                    uuid: anyUuid,
                    created_at: anyISODateTime,
                    updated_at: anyISODateTime,
                    subscriptions: anyArray,
                    labels: anyArray,
                    newsletters: Array(1).fill({
                        id: matchers.anyObjectId
                    })
                }]
            })
            .matchHeaderSnapshot({
                etag: anyEtag
            });

        await agent
            .post(`/members/`)
            .body({members: [member]})
            .expectStatus(422);
    });
});
