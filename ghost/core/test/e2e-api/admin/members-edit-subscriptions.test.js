const {agentProvider, mockManager, fixtureManager, matchers} = require('../../utils/e2e-framework');
const {anyContentVersion, anyEtag, anyObjectId, anyUuid, anyISODateTime, anyString, anyArray} = matchers;
const testUtils = require('../../utils');
const assert = require('assert/strict');
const models = require('../../../core/server/models');
const {stripeMocker} = require('../../utils/e2e-framework-mock-manager');
const DomainEvents = require('@tryghost/domain-events/lib/DomainEvents');
const settingsHelpers = require('../../../core/server/services/settings-helpers');
const sinon = require('sinon');

const subscriptionSnapshot = {
    id: anyString,
    start_date: anyString,
    current_period_end: anyString,
    price: {
        id: anyString,
        price_id: anyObjectId,
        tier: {
            id: anyString,
            tier_id: anyObjectId
        }
    },
    plan: {
        id: anyString
    },
    customer: {
        id: anyString
    }
};

const tierSnapshot = {
    id: anyObjectId,
    created_at: anyISODateTime,
    updated_at: anyISODateTime,
    monthly_price_id: anyString,
    yearly_price_id: anyString
};

const subscriptionSnapshotWithTier = {
    ...subscriptionSnapshot,
    tier: tierSnapshot
};

describe('Members API: edit subscriptions', function () {
    let agent;

    before(async function () {
        agent = await agentProvider.getAdminAPIAgent();
        await fixtureManager.init('posts', 'members', 'tiers:extra');
        await agent.loginAsOwner();
    });

    beforeEach(function () {
        sinon.stub(settingsHelpers, 'createUnsubscribeUrl').returns('http://domain.com/unsubscribe/?uuid=memberuuid&key=abc123dontstealme'); // member uuid changes with every test run
        mockManager.mockStripe();
        mockManager.mockMail();
    });

    afterEach(async function () {
        await mockManager.restore();
    });

    it('Can cancel a subscription', async function () {
        const memberId = testUtils.DataGenerator.Content.members[1].id;

        // Get the stripe price ID of the default price for month
        const price = await stripeMocker.getPriceForTier('default-product', 'year');

        const res = await agent
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
                    subscriptions: [subscriptionSnapshotWithTier],
                    newsletters: anyArray,
                    tiers: [tierSnapshot]
                })
            })
            .matchHeaderSnapshot({
                'content-version': anyContentVersion,
                etag: anyEtag
            });

        const subscriptionId = res.body.members[0].subscriptions[0].id;

        const editRes = await agent
            .put(`/members/${memberId}/subscriptions/${subscriptionId}`)
            .body({
                status: 'canceled'
            })
            .expectStatus(200)
            .matchBodySnapshot({
                members: new Array(1).fill({
                    id: anyObjectId,
                    uuid: anyUuid,
                    created_at: anyISODateTime,
                    updated_at: anyISODateTime,
                    labels: anyArray,
                    subscriptions: [subscriptionSnapshot],
                    newsletters: anyArray,
                    tiers: []
                })
            })
            .matchHeaderSnapshot({
                'content-version': anyContentVersion,
                etag: anyEtag
            });

        assert.equal('canceled', editRes.body.members[0].subscriptions[0].status);
    });

    it('Can cancel a subscription for a member with both comped and paid subscriptions', async function () {
        const email = 'comped-paid-combination@example.com';

        // Create this member with a comped product
        let member = await models.Member.add({
            email,
            email_disabled: false,
            products: [
                {
                    slug: 'gold'
                }
            ]
        });

        member = await models.Member.findOne({email}, {require: true, withRelated: ['products', 'stripeCustomers', 'stripeSubscriptions']});

        assert.equal(member.related('stripeCustomers').length, 0);
        assert.equal(member.related('stripeSubscriptions').length, 0);
        assert.equal(member.related('products').length, 1, 'This member should have one product');

        // Subscribe this to a paid product
        const customer1 = stripeMocker.createCustomer({
            email
        });
        const price1 = await stripeMocker.getPriceForTier('default-product', 'month');
        const subscription1 = await stripeMocker.createSubscription({
            customer: customer1,
            price: price1
        });
        await DomainEvents.allSettled();

        member = await models.Member.findOne({email}, {require: true, withRelated: ['products', 'stripeCustomers', 'stripeSubscriptions']});

        // Assert this member is subscribed to two products
        assert.equal(member.related('stripeCustomers').length, 1);
        assert.equal(member.related('stripeSubscriptions').length, 1);
        assert.equal(member.related('products').length, 2, 'This member should have two products');
        assert.deepEqual(member.related('products').models.map(m => m.get('slug')).sort(), ['default-product', 'gold']);

        // Cancel the paid subscription at period end
        // Now update one of those subscriptions immediately
        await agent
            .put(`/members/${member.id}/subscriptions/${subscription1.id}`)
            .body({
                cancel_at_period_end: true // = just an update, the subscription should remain active until it is ended
            })
            .expectStatus(200)
            .matchBodySnapshot({
                members: new Array(1).fill({
                    id: anyObjectId,
                    uuid: anyUuid,
                    created_at: anyISODateTime,
                    updated_at: anyISODateTime,
                    labels: anyArray,
                    subscriptions: anyArray,
                    newsletters: anyArray,
                    tiers: anyArray
                })
            })
            .matchHeaderSnapshot({
                'content-version': anyContentVersion,
                etag: anyEtag
            });

        // Assert products didn't change
        member = await models.Member.findOne({email}, {require: true, withRelated: ['products', 'stripeCustomers', 'stripeSubscriptions']});
        assert.equal(member.related('stripeCustomers').length, 1);
        assert.equal(member.related('stripeSubscriptions').length, 1);
        assert.equal(member.related('products').length, 2, 'This member should have two products');
        assert.deepEqual(member.related('products').models.map(m => m.get('slug')).sort(), ['default-product', 'gold']);

        // Now cancel for real
        await agent
            .put(`/members/${member.id}/subscriptions/${subscription1.id}`)
            .body({
                status: 'canceled'
            })
            .expectStatus(200)
            .matchBodySnapshot({
                members: new Array(1).fill({
                    id: anyObjectId,
                    uuid: anyUuid,
                    created_at: anyISODateTime,
                    updated_at: anyISODateTime,
                    labels: anyArray,
                    subscriptions: anyArray,
                    newsletters: anyArray,
                    tiers: anyArray
                })
            })
            .matchHeaderSnapshot({
                'content-version': anyContentVersion,
                etag: anyEtag
            });

        // Assert product is removed, but comped is maintained
        member = await models.Member.findOne({email}, {require: true, withRelated: ['products', 'stripeCustomers', 'stripeSubscriptions']});
        assert.equal(member.related('stripeCustomers').length, 1);
        assert.equal(member.related('stripeSubscriptions').length, 1);
        assert.equal(member.related('products').length, 1, 'This member should have one product');
        assert.deepEqual(member.related('products').models.map(m => m.get('slug')).sort(), ['gold']);
    });

    it('Can cancel a subscription for a member with duplicate customers', async function () {
        const email = 'duplicate-customers-test@example.com';

        // We create duplicate customers to mimick a situation where a member is connected to two customers
        const customer1 = stripeMocker.createCustomer({
            email
        });

        const customer2 = stripeMocker.createCustomer({
            email
        });

        const price1 = await stripeMocker.getPriceForTier('default-product', 'month');
        const price2 = await stripeMocker.getPriceForTier('gold', 'year');

        const subscription1 = await stripeMocker.createSubscription({
            customer: customer1,
            price: price1
        });

        const subscription2 = await stripeMocker.createSubscription({
            customer: customer2,
            price: price2
        });

        await DomainEvents.allSettled();

        let member = await models.Member.findOne({email}, {require: true, withRelated: ['products', 'stripeCustomers', 'stripeSubscriptions']});

        // Assert this member is subscribed to two products
        assert.equal(member.related('stripeCustomers').length, 2);
        assert.equal(member.related('stripeSubscriptions').length, 2);
        assert.equal(member.related('products').length, 2, 'This member should have two products');

        // Now cancel one of those subscriptions immediately
        await agent
            .put(`/members/${member.id}/subscriptions/${subscription2.id}`)
            .body({
                status: 'canceled'
            })
            .expectStatus(200)
            .matchBodySnapshot({
                members: new Array(1).fill({
                    id: anyObjectId,
                    uuid: anyUuid,
                    created_at: anyISODateTime,
                    updated_at: anyISODateTime,
                    labels: anyArray,
                    subscriptions: anyArray,
                    newsletters: anyArray,
                    tiers: anyArray
                })
            })
            .matchHeaderSnapshot({
                'content-version': anyContentVersion,
                etag: anyEtag
            });

        // Update member
        member = await models.Member.findOne({email}, {require: true, withRelated: ['products', 'stripeCustomers', 'stripeSubscriptions']});

        // Assert this member is subscribed to one products
        assert.equal(member.related('stripeCustomers').length, 2);
        assert.equal(member.related('stripeSubscriptions').length, 2);
        assert.equal(member.related('products').length, 1, 'This member should only have one remaning product');

        // Cancel the other subscription
        await agent
            .put(`/members/${member.id}/subscriptions/${subscription1.id}`)
            .body({
                status: 'canceled'
            })
            .expectStatus(200)
            .matchBodySnapshot({
                members: new Array(1).fill({
                    id: anyObjectId,
                    uuid: anyUuid,
                    created_at: anyISODateTime,
                    updated_at: anyISODateTime,
                    labels: anyArray,
                    subscriptions: anyArray,
                    newsletters: anyArray,
                    tiers: anyArray
                })
            })
            .matchHeaderSnapshot({
                'content-version': anyContentVersion,
                etag: anyEtag
            });

        // Update member
        member = await models.Member.findOne({email}, {require: true, withRelated: ['products', 'stripeCustomers', 'stripeSubscriptions']});

        // Assert this member is subscribed to one products
        assert.equal(member.related('stripeCustomers').length, 2);
        assert.equal(member.related('stripeSubscriptions').length, 2);
        assert.equal(member.related('products').length, 0, 'This member should only have no remaning products');
    });

    it('Can cancel a subscription for a member with duplicate subscriptions', async function () {
        const email = 'duplicate-subscription-test@example.com';

        // We create duplicate customers to mimick a situation where a member is connected to two customers
        const customer1 = stripeMocker.createCustomer({
            email
        });

        const price1 = await stripeMocker.getPriceForTier('default-product', 'month');
        const price2 = await stripeMocker.getPriceForTier('gold', 'year');

        const subscription1 = await stripeMocker.createSubscription({
            customer: customer1,
            price: price1
        });

        const subscription2 = await stripeMocker.createSubscription({
            customer: customer1,
            price: price2
        });

        await DomainEvents.allSettled();

        let member = await models.Member.findOne({email}, {require: true, withRelated: ['products', 'stripeCustomers', 'stripeSubscriptions']});

        // Assert this member is subscribed to two products
        assert.equal(member.related('stripeCustomers').length, 1);
        assert.equal(member.related('stripeSubscriptions').length, 2);
        assert.equal(member.related('products').length, 2, 'This member should have two products');

        // Now cancel one of those subscriptions immediately
        await agent
            .put(`/members/${member.id}/subscriptions/${subscription2.id}`)
            .body({
                status: 'canceled'
            })
            .expectStatus(200)
            .matchBodySnapshot({
                members: new Array(1).fill({
                    id: anyObjectId,
                    uuid: anyUuid,
                    created_at: anyISODateTime,
                    updated_at: anyISODateTime,
                    labels: anyArray,
                    subscriptions: anyArray,
                    newsletters: anyArray,
                    tiers: anyArray
                })
            })
            .matchHeaderSnapshot({
                'content-version': anyContentVersion,
                etag: anyEtag
            });

        // Update member
        member = await models.Member.findOne({email}, {require: true, withRelated: ['products', 'stripeCustomers', 'stripeSubscriptions']});

        // Assert this member is subscribed to one products
        assert.equal(member.related('stripeCustomers').length, 1);
        assert.equal(member.related('stripeSubscriptions').length, 2);
        assert.equal(member.related('products').length, 1, 'This member should only have one remaning product');

        // Cancel the other subscription
        await agent
            .put(`/members/${member.id}/subscriptions/${subscription1.id}`)
            .body({
                status: 'canceled'
            })
            .expectStatus(200)
            .matchBodySnapshot({
                members: new Array(1).fill({
                    id: anyObjectId,
                    uuid: anyUuid,
                    created_at: anyISODateTime,
                    updated_at: anyISODateTime,
                    labels: anyArray,
                    subscriptions: anyArray,
                    newsletters: anyArray,
                    tiers: anyArray
                })
            })
            .matchHeaderSnapshot({
                'content-version': anyContentVersion,
                etag: anyEtag
            });

        // Update member
        member = await models.Member.findOne({email}, {require: true, withRelated: ['products', 'stripeCustomers', 'stripeSubscriptions']});

        // Assert this member is subscribed to one products
        assert.equal(member.related('stripeCustomers').length, 1);
        assert.equal(member.related('stripeSubscriptions').length, 2);
        assert.equal(member.related('products').length, 0, 'This member should only have no remaning products');
    });

    it('Can update a subscription for a member with duplicate subscriptions', async function () {
        const email = 'duplicate-subscription-edit-test@example.com';

        // We create duplicate customers to mimick a situation where a member is connected to two customers
        const customer1 = stripeMocker.createCustomer({
            email
        });

        const customer2 = stripeMocker.createCustomer({
            email
        });

        const price1 = await stripeMocker.getPriceForTier('default-product', 'month');
        const price2 = await stripeMocker.getPriceForTier('gold', 'year');

        const subscription1 = await stripeMocker.createSubscription({
            customer: customer1,
            price: price1
        });

        const subscription2 = await stripeMocker.createSubscription({
            customer: customer2,
            price: price2
        });

        await DomainEvents.allSettled();

        let member = await models.Member.findOne({email}, {require: true, withRelated: ['products', 'stripeCustomers', 'stripeSubscriptions']});

        // Assert this member is subscribed to two products
        assert.equal(member.related('stripeCustomers').length, 2);
        assert.equal(member.related('stripeSubscriptions').length, 2);
        assert.equal(member.related('products').length, 2, 'This member should have two products');

        // Now update one of those subscriptions immediately
        await agent
            .put(`/members/${member.id}/subscriptions/${subscription2.id}`)
            .body({
                cancel_at_period_end: true // = just an update, the subscription should remain active until it is ended
            })
            .expectStatus(200)
            .matchBodySnapshot({
                members: new Array(1).fill({
                    id: anyObjectId,
                    uuid: anyUuid,
                    created_at: anyISODateTime,
                    updated_at: anyISODateTime,
                    labels: anyArray,
                    subscriptions: anyArray,
                    newsletters: anyArray,
                    tiers: anyArray
                })
            })
            .matchHeaderSnapshot({
                'content-version': anyContentVersion,
                etag: anyEtag
            });

        // Update member
        member = await models.Member.findOne({email}, {require: true, withRelated: ['products', 'stripeCustomers', 'stripeSubscriptions']});

        // Assert this member is subscribed to one products
        assert.equal(member.related('stripeCustomers').length, 2);
        assert.equal(member.related('stripeSubscriptions').length, 2);
        assert.equal(member.related('products').length, 2, 'This member should still have two products');

        // Cancel the other subscription
        await agent
            .put(`/members/${member.id}/subscriptions/${subscription1.id}`)
            .body({
                cancel_at_period_end: true
            })
            .expectStatus(200)
            .matchBodySnapshot({
                members: new Array(1).fill({
                    id: anyObjectId,
                    uuid: anyUuid,
                    created_at: anyISODateTime,
                    updated_at: anyISODateTime,
                    labels: anyArray,
                    subscriptions: anyArray,
                    newsletters: anyArray,
                    tiers: anyArray
                })
            })
            .matchHeaderSnapshot({
                'content-version': anyContentVersion,
                etag: anyEtag
            });

        // Update member
        member = await models.Member.findOne({email}, {require: true, withRelated: ['products', 'stripeCustomers', 'stripeSubscriptions']});

        // Assert this member is subscribed to one products
        assert.equal(member.related('stripeCustomers').length, 2);
        assert.equal(member.related('stripeSubscriptions').length, 2);
        assert.equal(member.related('products').length, 2, 'This member should still have two products');
    });

    it('Can recover member products when we cancel a subscription', async function () {
        /**
         * This tests a situation where a bug didn't set the products for a member correctly in the past when it had multiple subscriptions.
         * This tests what happens when we cancel the remaining product. To recover from this, we should set the products correctly after the cancelation.
         */
        const email = 'duplicate-subscription-wrongfully-test@example.com';

        // We create duplicate customers to mimick a situation where a member is connected to two customers
        const customer1 = stripeMocker.createCustomer({
            email
        });

        const customer2 = stripeMocker.createCustomer({
            email
        });

        const price1 = await stripeMocker.getPriceForTier('default-product', 'month');
        const price2 = await stripeMocker.getPriceForTier('gold', 'year');

        const subscription1 = await stripeMocker.createSubscription({
            customer: customer1,
            price: price1
        });

        const subscription2 = await stripeMocker.createSubscription({
            customer: customer2,
            price: price2
        });

        await DomainEvents.allSettled();

        let member = await models.Member.findOne({email}, {require: true, withRelated: ['products', 'stripeCustomers', 'stripeSubscriptions']});

        // Assert this member is subscribed to two products
        assert.equal(member.get('status'), 'paid');
        assert.equal(member.related('stripeCustomers').length, 2);
        assert.equal(member.related('stripeSubscriptions').length, 2);
        assert.equal(member.related('products').length, 2, 'This member should have two products');

        // Manually unlink the first product from the member, to simulate a bug from the past
        // where we didn't store the products correctly
        await models.Member.edit({products: member.related('products').models.filter(p => p.get('slug') !== 'default-product')}, {id: member.id});

        // Assert only one product left
        member = await models.Member.findOne({email}, {require: true, withRelated: ['products', 'stripeCustomers', 'stripeSubscriptions']});
        assert.equal(member.related('products').length, 1, 'This member should have one product after the update');
        assert.equal(member.related('products').models[0].get('slug'), 'gold');

        // Now cancel the second subscription (from the remaining product)
        await agent
            .put(`/members/${member.id}/subscriptions/${subscription2.id}`)
            .body({
                status: 'canceled'
            })
            .expectStatus(200)
            .matchBodySnapshot({
                members: new Array(1).fill({
                    id: anyObjectId,
                    uuid: anyUuid,
                    created_at: anyISODateTime,
                    updated_at: anyISODateTime,
                    labels: anyArray,
                    subscriptions: anyArray,
                    newsletters: anyArray,
                    tiers: anyArray
                })
            })
            .matchHeaderSnapshot({
                'content-version': anyContentVersion,
                etag: anyEtag
            });

        // Update member
        member = await models.Member.findOne({email}, {require: true, withRelated: ['products', 'stripeCustomers', 'stripeSubscriptions']});

        // Assert this member is subscribed to one products
        assert.equal(member.get('status'), 'paid');
        assert.equal(member.related('stripeCustomers').length, 2);
        assert.equal(member.related('stripeSubscriptions').length, 2);
        assert.equal(member.related('products').length, 1, 'This member should still have the other product that was wrongfully removed in the past');
        assert.equal(member.related('products').models[0].get('slug'), 'default-product', 'This member should still have the other product that was wrongfully removed in the past');

        // Cancel the other subscription
        await agent
            .put(`/members/${member.id}/subscriptions/${subscription1.id}`)
            .body({
                status: 'canceled'
            })
            .expectStatus(200)
            .matchBodySnapshot({
                members: new Array(1).fill({
                    id: anyObjectId,
                    uuid: anyUuid,
                    created_at: anyISODateTime,
                    updated_at: anyISODateTime,
                    labels: anyArray,
                    subscriptions: anyArray,
                    newsletters: anyArray,
                    tiers: anyArray
                })
            })
            .matchHeaderSnapshot({
                'content-version': anyContentVersion,
                etag: anyEtag
            });

        // Update member
        member = await models.Member.findOne({email}, {require: true, withRelated: ['products', 'stripeCustomers', 'stripeSubscriptions']});

        // Assert this member is subscribed to one products
        assert.equal(member.get('status'), 'free');
        assert.equal(member.related('stripeCustomers').length, 2);
        assert.equal(member.related('stripeSubscriptions').length, 2);
        assert.equal(member.related('products').length, 0);
    });

    it('Can recover member products when we update a subscription', async function () {
        /**
         * This tests a situation where a bug didn't set the products for a member correctly in the past when it had multiple subscriptions.
         * This tests what happens when we cancel the remaining product. To recover from this, we should set the products correctly after the cancelation.
         */
        const email = 'duplicate-subscription-wrongfully-test2@example.com';

        // We create duplicate customers to mimick a situation where a member is connected to two customers
        const customer1 = stripeMocker.createCustomer({
            email
        });

        const customer2 = stripeMocker.createCustomer({
            email
        });

        const price1 = await stripeMocker.getPriceForTier('default-product', 'month');
        const price2 = await stripeMocker.getPriceForTier('gold', 'year');

        await stripeMocker.createSubscription({
            customer: customer1,
            price: price1
        });

        const subscription2 = await stripeMocker.createSubscription({
            customer: customer2,
            price: price2
        });

        await DomainEvents.allSettled();

        let member = await models.Member.findOne({email}, {require: true, withRelated: ['products', 'stripeCustomers', 'stripeSubscriptions']});

        // Assert this member is subscribed to two products
        assert.equal(member.get('status'), 'paid');
        assert.equal(member.related('stripeCustomers').length, 2);
        assert.equal(member.related('stripeSubscriptions').length, 2);
        assert.equal(member.related('products').length, 2, 'This member should have two products');

        // Manually unlink the first product from the member, to simulate a bug from the past
        // where we didn't store the products correctly
        await models.Member.edit({products: member.related('products').models.filter(p => p.get('slug') !== 'default-product')}, {id: member.id});

        // Assert only one product left
        member = await models.Member.findOne({email}, {require: true, withRelated: ['products', 'stripeCustomers', 'stripeSubscriptions']});
        assert.equal(member.get('status'), 'paid');
        assert.equal(member.related('products').length, 1, 'This member should have one product after the update');
        assert.equal(member.related('products').models[0].get('slug'), 'gold');

        // Now cancel the second subscription (from the remaining product)
        await agent
            .put(`/members/${member.id}/subscriptions/${subscription2.id}`)
            .body({
                cancel_at_period_end: true // = just an update, the subscription should remain active until it is ended
            })
            .expectStatus(200)
            .matchBodySnapshot({
                members: new Array(1).fill({
                    id: anyObjectId,
                    uuid: anyUuid,
                    created_at: anyISODateTime,
                    updated_at: anyISODateTime,
                    labels: anyArray,
                    subscriptions: anyArray,
                    newsletters: anyArray,
                    tiers: anyArray
                })
            })
            .matchHeaderSnapshot({
                'content-version': anyContentVersion,
                etag: anyEtag
            });

        // Update member
        member = await models.Member.findOne({email}, {require: true, withRelated: ['products', 'stripeCustomers', 'stripeSubscriptions']});

        // Assert this member is subscribed to one products
        assert.equal(member.get('status'), 'paid');
        assert.equal(member.related('stripeCustomers').length, 2);
        assert.equal(member.related('stripeSubscriptions').length, 2);
        assert.equal(member.related('products').length, 2, 'Should readd the product that was wrongfully removed in the past');
    });

    it('Can edit the price of a subscription directly in Stripe', async function () {
        const email = 'edit-subscription-product-in-stripe@example.com';

        // We create duplicate customers to mimick a situation where a member is connected to two customers
        const customer1 = stripeMocker.createCustomer({
            email
        });

        const price1 = await stripeMocker.getPriceForTier('default-product', 'month');
        const price2 = await stripeMocker.getPriceForTier('gold', 'year');

        const subscription1 = await stripeMocker.createSubscription({
            customer: customer1,
            price: price1
        });

        await DomainEvents.allSettled();

        let member = await models.Member.findOne({email}, {require: true, withRelated: ['products', 'stripeCustomers', 'stripeSubscriptions']});

        assert.equal(member.get('status'), 'paid');
        assert.equal(member.related('stripeCustomers').length, 1);
        assert.equal(member.related('stripeSubscriptions').length, 1);
        assert.equal(member.related('products').length, 1);
        assert.equal(member.related('products').models[0].get('slug'), 'default-product');

        // Change subscription price in Stripe
        // This will send a webhook to Ghost
        await stripeMocker.updateSubscription({
            id: subscription1.id,
            items: {
                type: 'list',
                data: [
                    {
                        price: price2
                    }
                ]
            }
        });

        member = await models.Member.findOne({email}, {require: true, withRelated: ['products', 'stripeCustomers', 'stripeSubscriptions']});

        assert.equal(member.get('status'), 'paid');
        assert.equal(member.related('stripeCustomers').length, 1);
        assert.equal(member.related('stripeSubscriptions').length, 1);
        assert.equal(member.related('products').length, 1);
        assert.equal(member.related('products').models[0].get('slug'), 'gold');
    });

    it('Can edit the price of a subscription directly in Stripe when having duplicate subscriptions', async function () {
        const email = 'edit-subscription-product-in-stripe-dup@example.com';

        // We create duplicate customers to mimick a situation where a member is connected to two customers
        const customer1 = stripeMocker.createCustomer({
            email
        });
        const customer2 = stripeMocker.createCustomer({
            email
        });

        const price1 = await stripeMocker.getPriceForTier('default-product', 'month');
        const price2 = await stripeMocker.getPriceForTier('gold', 'year');
        const price3 = await stripeMocker.getPriceForTier('silver', 'year');

        const subscription1 = await stripeMocker.createSubscription({
            customer: customer1,
            price: price1
        });

        await stripeMocker.createSubscription({
            customer: customer2,
            price: price2
        });

        await DomainEvents.allSettled();

        let member = await models.Member.findOne({email}, {require: true, withRelated: ['products', 'stripeCustomers', 'stripeSubscriptions']});

        assert.equal(member.get('status'), 'paid');
        assert.equal(member.related('stripeCustomers').length, 2);
        assert.equal(member.related('stripeSubscriptions').length, 2);
        assert.equal(member.related('products').length, 2);
        assert.deepEqual(member.related('products').models.map(m => m.get('slug')).sort(), ['default-product', 'gold']);

        // Change subscription price in Stripe
        // This will send a webhook to Ghost
        await stripeMocker.updateSubscription({
            id: subscription1.id,
            items: {
                type: 'list',
                data: [
                    {
                        price: price3
                    }
                ]
            }
        });

        member = await models.Member.findOne({email}, {require: true, withRelated: ['products', 'stripeCustomers', 'stripeSubscriptions']});

        assert.equal(member.get('status'), 'paid');
        assert.equal(member.related('stripeCustomers').length, 2);
        assert.equal(member.related('stripeSubscriptions').length, 2);
        assert.equal(member.related('products').length, 2);
        assert.deepEqual(member.related('products').models.map(m => m.get('slug')).sort(), ['gold', 'silver']);
    });
});
