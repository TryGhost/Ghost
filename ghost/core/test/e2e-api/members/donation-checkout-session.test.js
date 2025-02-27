const {agentProvider, mockManager, fixtureManager} = require('../../utils/e2e-framework');
const {stripeMocker} = require('../../utils/e2e-framework-mock-manager');
const models = require('../../../core/server/models');
const assert = require('assert/strict');
const urlService = require('../../../core/server/services/url');
const DomainEvents = require('@tryghost/domain-events');

let membersAgent, adminAgent;

async function getPost(id) {
    // eslint-disable-next-line dot-notation
    return await models['Post'].where('id', id).fetch({require: true});
}

describe('Create Stripe Checkout Session for Donations', function () {
    before(async function () {
        const agents = await agentProvider.getAgentsForMembers();
        membersAgent = agents.membersAgent;
        adminAgent = agents.adminAgent;

        await fixtureManager.init('posts', 'members');
        await adminAgent.loginAsOwner();
    });

    beforeEach(function () {
        mockManager.mockStripe();
        mockManager.mockMail();
    });

    afterEach(function () {
        mockManager.restore();
    });

    it('Can create an anonymous checkout session for a donation', async function () {
        // Fake a visit to a post
        const post = await getPost(fixtureManager.get('posts', 0).id);
        const url = urlService.getUrlByResourceId(post.id, {absolute: false});

        await membersAgent.post('/api/create-stripe-checkout-session/')
            .body({
                customerEmail: 'paid@test.com',
                type: 'donation',
                successUrl: 'https://example.com/?type=success',
                cancelUrl: 'https://example.com/?type=cancel',
                metadata: {
                    test: 'hello',
                    urlHistory: [
                        {
                            path: url,
                            time: Date.now(),
                            referrerMedium: null,
                            referrerSource: 'ghost-explore',
                            referrerUrl: 'https://example.com/blog/'
                        }
                    ]
                }
            })
            .expectStatus(200)
            .matchBodySnapshot();

        // Send a webhook of a completed checkout session for this donation
        await stripeMocker.sendWebhook({
            type: 'checkout.session.completed',
            data: {
                object: {
                    mode: 'payment',
                    amount_total: 1200,
                    currency: 'usd',
                    customer: (stripeMocker.checkoutSessions[0].customer),
                    customer_details: {
                        name: 'Paid Test',
                        email: 'exampledonation@example.com'
                    },
                    metadata: {
                        ...(stripeMocker.checkoutSessions[0].metadata ?? {}),
                        ghost_donation: true
                    },
                    custom_fields: [{
                        key: 'donation_message',
                        text: {
                            value: 'You are the best! Have a lovely day!'
                        }
                    }]
                }
            }
        });

        // Check email received
        mockManager.assert.sentEmail({
            subject: '💰 One-time payment received: $12.00 from Paid Test',
            to: 'jbloggs@example.com'
        });

        // Check stored in database
        const lastDonation = await models.DonationPaymentEvent.findOne({
            email: 'exampledonation@example.com'
        }, {require: true});

        assert.equal(lastDonation.get('amount'), 1200);
        assert.equal(lastDonation.get('currency'), 'usd');
        assert.equal(lastDonation.get('email'), 'exampledonation@example.com');
        assert.equal(lastDonation.get('name'), 'Paid Test');
        assert.equal(lastDonation.get('member_id'), null);
        assert.equal(lastDonation.get('donation_message'), 'You are the best! Have a lovely day!');

        // Check referrer
        assert.equal(lastDonation.get('referrer_url'), 'example.com');
        assert.equal(lastDonation.get('referrer_medium'), 'Ghost Network');
        assert.equal(lastDonation.get('referrer_source'), 'Ghost Explore');

        // Check attributed correctly
        assert.equal(lastDonation.get('attribution_id'), post.id);
        assert.equal(lastDonation.get('attribution_type'), 'post');
        assert.equal(lastDonation.get('attribution_url'), url);
    });

    it('Can create a member checkout session for a donation', async function () {
        // Fake a visit to a post
        const post = await getPost(fixtureManager.get('posts', 0).id);
        const url = urlService.getUrlByResourceId(post.id, {absolute: false});

        const email = 'test-member-create-donation-session@email.com';

        const membersService = require('../../../core/server/services/members');
        const member = await membersService.api.members.create({email, name: 'Member Test'});
        const token = await membersService.api.getMemberIdentityToken(member.get('transient_id'));

        await DomainEvents.allSettled();

        // Check email received
        mockManager.assert.sentEmail({
            subject: '🥳 Free member signup: Member Test',
            to: 'jbloggs@example.com'
        });

        await membersAgent.post('/api/create-stripe-checkout-session/')
            .body({
                mode: 'payment',
                customerEmail: email,
                identity: token,
                type: 'donation',
                successUrl: 'https://example.com/?type=success',
                cancelUrl: 'https://example.com/?type=cancel',
                metadata: {
                    test: 'hello',
                    urlHistory: [
                        {
                            path: url,
                            time: Date.now(),
                            referrerMedium: null,
                            referrerSource: 'ghost-explore',
                            referrerUrl: 'https://example.com/blog/'
                        }
                    ]
                }
            })
            .expectStatus(200)
            .matchBodySnapshot();

        // Send a webhook of a completed checkout session for this donation
        await stripeMocker.sendWebhook({
            type: 'checkout.session.completed',
            data: {
                object: {
                    mode: 'payment',
                    amount_total: 1220,
                    currency: 'eur',
                    customer: (stripeMocker.checkoutSessions[0].customer),
                    customer_details: {
                        name: 'Member Test',
                        email: email
                    },
                    metadata: {
                        ...(stripeMocker.checkoutSessions[0].metadata ?? {}),
                        ghost_donation: true
                    },
                    custom_fields: [{
                        key: 'donation_message',
                        text: {
                            value: 'You are the best! Have a lovely day!'
                        }
                    }]
                }
            }
        });

        // Check email received
        mockManager.assert.sentEmail({
            subject: '💰 One-time payment received: €12.20 from Member Test',
            to: 'jbloggs@example.com'
        });

        // Check stored in database
        const lastDonation = await models.DonationPaymentEvent.findOne({
            email
        }, {require: true});
        assert.equal(lastDonation.get('amount'), 1220);
        assert.equal(lastDonation.get('currency'), 'eur');
        assert.equal(lastDonation.get('email'), email);
        assert.equal(lastDonation.get('name'), 'Member Test');
        assert.equal(lastDonation.get('member_id'), member.id);
        assert.equal(lastDonation.get('donation_message'), 'You are the best! Have a lovely day!');

        // Check referrer
        assert.equal(lastDonation.get('referrer_url'), 'example.com');
        assert.equal(lastDonation.get('referrer_medium'), 'Ghost Network');
        assert.equal(lastDonation.get('referrer_source'), 'Ghost Explore');

        // Check attributed correctly
        assert.equal(lastDonation.get('attribution_id'), post.id);
        assert.equal(lastDonation.get('attribution_type'), 'post');
        assert.equal(lastDonation.get('attribution_url'), url);
    });

    it('check if donation message is in email', async function () {
        const post = await getPost(fixtureManager.get('posts', 0).id);
        const url = urlService.getUrlByResourceId(post.id, {absolute: false});

        await membersAgent.post('/api/create-stripe-checkout-session/')
            .body({
                mode: 'payment',
                type: 'donation',
                customerEmail: 'paid@test.com',
                successUrl: 'https://example.com/?type=success',
                cancelUrl: 'https://example.com/?type=cancel',
                metadata: {
                    urlHistory: [
                        {
                            path: url,
                            time: Date.now(),
                            referrerMedium: null,
                            referrerSource: 'ghost-explore',
                            referrerUrl: 'https://example.com/blog/'
                        }
                    ],
                    ghost_donation: true
                },
                custom_fields: [{
                    key: 'donation_message',
                    label: {
                        type: 'custom',
                        custom: 'Add a personal note'
                    },
                    type: 'text',
                    optional: true
                }]
            })
            .expectStatus(200)
            .matchBodySnapshot();

        // Send a webhook of a completed checkout session for this donation
        await stripeMocker.sendWebhook({
            type: 'checkout.session.completed',
            data: {
                object: {
                    mode: 'payment',
                    amount_total: 1200,
                    currency: 'usd',
                    customer: (stripeMocker.checkoutSessions[0].customer),
                    customer_details: {
                        name: 'Paid Test',
                        email: 'exampledonation@example.com'
                    },
                    metadata: {
                        ...(stripeMocker.checkoutSessions[0].metadata ?? {}),
                        ghost_donation: true
                    },
                    custom_fields: [{
                        key: 'donation_message',
                        text: {
                            value: 'You are the best! Have a lovely day!'
                        }
                    }]
                }
            }
        });

        // check if donation message is in email
        mockManager.assert.sentEmail({
            subject: '💰 One-time payment received: $12.00 from Paid Test',
            to: 'jbloggs@example.com',
            text: /You are the best! Have a lovely day!/
        });
    });

    // We had a bug where the stripe_prices.nickname column was too short for the site title
    // Stripe is also limited to 250 chars so we need to truncate the nickname
    it('can create a checkout session for a site with a long title', async function () {
        // Ensure site title is longer than 250 characters
        mockManager.mockSetting('title', 'a'.repeat(251));

        // clear out existing prices to guarantee we're creating a new one
        await models.StripePrice.where('type', 'donation').destroy().catch((e) => {
            if (e.message !== 'No Rows Deleted') {
                throw e;
            }
        });

        // Fake a visit to a post
        const post = await getPost(fixtureManager.get('posts', 0).id);
        const url = urlService.getUrlByResourceId(post.id, {absolute: false});

        await membersAgent.post('/api/create-stripe-checkout-session/')
            .body({
                customerEmail: 'paid@test.com',
                type: 'donation',
                successUrl: 'https://example.com/?type=success',
                cancelUrl: 'https://example.com/?type=cancel',
                metadata: {
                    test: 'hello',
                    urlHistory: [
                        {
                            path: url,
                            time: Date.now(),
                            referrerMedium: null,
                            referrerSource: 'ghost-explore',
                            referrerUrl: 'https://example.com/blog/'
                        }
                    ]
                }
            })
            .expectStatus(200)
            .matchBodySnapshot();

        const latestStripePrice = await models.StripePrice
            .where('type', 'donation')
            .orderBy('created_at', 'DESC')
            .fetch({require: true});

        latestStripePrice.get('nickname').should.have.length(250);
    });
    it('Can create a checkout session with a personal note included', async function () {
        const post = await getPost(fixtureManager.get('posts', 0).id);
        const url = urlService.getUrlByResourceId(post.id, {absolute: false});

        await membersAgent.post('/api/create-stripe-checkout-session/')
            .body({
                customerEmail: 'noob@test.com',
                type: 'donation',
                successUrl: 'https://example.com/?type=success',
                cancelUrl: 'https://example.com/?type=cancel',
                metadata: {
                    test: 'hello',
                    urlHistory: [
                        {
                            path: url,
                            time: Date.now(),
                            referrerMedium: null,
                            referrerSource: 'ghost-explore',
                            referrerUrl: 'https://example.com/blog/'
                        }
                    ]
                },
                personalNote: 'Please leave a note, gracias!'
            })
            .expectStatus(200)
            .matchBodySnapshot();
    });
});
