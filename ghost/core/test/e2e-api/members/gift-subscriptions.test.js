const assert = require('node:assert/strict');
const DomainEvents = require('@tryghost/domain-events');
const {agentProvider, mockManager, fixtureManager, matchers} = require('../../utils/e2e-framework');
const {stripeMocker} = require('../../utils/e2e-framework-mock-manager');
const models = require('../../../core/server/models');
const {anyErrorId} = matchers;

let membersAgent, adminAgent;

async function getPaidTier() {
    const {body: {tiers}} = await adminAgent.get('/tiers/?include=monthly_price&yearly_price');

    return tiers.find(tier => tier.type === 'paid');
}

function getLatestCheckoutSession() {
    return stripeMocker.checkoutSessions[stripeMocker.checkoutSessions.length - 1];
}

function toWebhookMetadata(metadata) {
    const result = {};

    for (const [key, value] of Object.entries(metadata)) {
        result[key] = String(value);
    }

    return result;
}

describe('Gift Subscriptions', function () {
    before(async function () {
        const agents = await agentProvider.getAgentsForMembers();

        membersAgent = agents.membersAgent;
        adminAgent = agents.adminAgent;

        await fixtureManager.init('members');
        await adminAgent.loginAsOwner();
    });

    beforeEach(function () {
        mockManager.mockStripe();
        mockManager.mockMail();
        mockManager.mockLabsEnabled('giftSubscriptions');
    });

    afterEach(function () {
        mockManager.restore();
    });

    it('Can purchase a gift as an anonymous visitor', async function () {
        const paidTier = await getPaidTier();

        await membersAgent.post('/api/create-stripe-checkout-session/')
            .body({
                type: 'gift',
                tierId: paidTier.id,
                cadence: 'month',
                metadata: {}
            })
            .expectStatus(200)
            .matchBodySnapshot();

        // Note: StripeMocker's qs.parse decoder converts 'true' to boolean true
        // and numeric strings to numbers, so we check with loose equality where needed
        const checkoutSession = getLatestCheckoutSession();

        assert.ok(checkoutSession, 'Checkout session should be captured');
        assert.ok(checkoutSession.metadata.ghost_gift, 'Should have ghost_gift metadata');
        assert.equal(checkoutSession.metadata.tier_id, paidTier.id);
        assert.equal(checkoutSession.metadata.cadence, 'month');
        assert.equal(String(checkoutSession.metadata.duration), '1');
        assert.ok(checkoutSession.metadata.gift_token, 'Should have a gift token');

        await stripeMocker.sendWebhook({
            type: 'checkout.session.completed',
            data: {
                object: {
                    id: checkoutSession.id,
                    mode: 'payment',
                    amount_total: paidTier.monthly_price,
                    currency: paidTier.currency.toLowerCase(),
                    customer: checkoutSession.customer,
                    customer_details: {email: 'gift-buyer@example.com'},
                    metadata: toWebhookMetadata(checkoutSession.metadata),
                    payment_intent: 'pi_gift_test_123'
                }
            }
        });

        await DomainEvents.allSettled();

        // Verify gift record was persisted in the database
        const gift = await models.Gift.findOne({
            token: checkoutSession.metadata.gift_token
        }, {require: true});

        assert.equal(gift.get('buyer_email'), 'gift-buyer@example.com');
        assert.equal(gift.get('buyer_member_id'), null);
        assert.equal(gift.get('tier_id'), paidTier.id);
        assert.equal(gift.get('cadence'), 'month');
        assert.equal(gift.get('duration'), 1);
        assert.equal(gift.get('amount'), paidTier.monthly_price);
        assert.equal(gift.get('currency'), paidTier.currency.toLowerCase());
        assert.equal(gift.get('status'), 'purchased');
        assert.equal(gift.get('stripe_payment_intent_id'), 'pi_gift_test_123');
        assert.ok(gift.get('purchased_at'), 'Should have purchased_at');
        assert.ok(gift.get('expires_at'), 'Should have expires_at');
        assert.equal(gift.get('redeemer_member_id'), null);
        assert.equal(gift.get('redeemed_at'), null);

        // Verify staff notification email was sent
        mockManager.assert.sentEmail({
            subject: /gift subscription/i,
            to: 'jbloggs@example.com'
        });

        // Verify buyer confirmation email was sent
        mockManager.assert.sentEmail({
            to: 'gift-buyer@example.com'
        });
    });

    it('Can purchase a gift as an authenticated member', async function () {
        const paidTier = await getPaidTier();
        const email = 'gift-member-buyer@example.com';

        const membersService = require('../../../core/server/services/members');

        const member = await membersService.api.members.create({email, name: 'Gift Buyer'});
        const token = await membersService.api.getMemberIdentityToken(member.get('transient_id'));

        await DomainEvents.allSettled();

        await membersAgent.post('/api/create-stripe-checkout-session/')
            .body({
                type: 'gift',
                tierId: paidTier.id,
                cadence: 'year',
                identity: token,
                metadata: {}
            })
            .expectStatus(200)
            .matchBodySnapshot();

        const checkoutSession = getLatestCheckoutSession();

        assert.ok(checkoutSession, 'Checkout session should be captured');
        assert.equal(checkoutSession.metadata.cadence, 'year');

        await stripeMocker.sendWebhook({
            type: 'checkout.session.completed',
            data: {
                object: {
                    id: checkoutSession.id,
                    mode: 'payment',
                    amount_total: paidTier.yearly_price,
                    currency: paidTier.currency.toLowerCase(),
                    customer: checkoutSession.customer,
                    customer_details: {email},
                    metadata: toWebhookMetadata(checkoutSession.metadata),
                    payment_intent: 'pi_gift_member_test_456'
                }
            }
        });

        await DomainEvents.allSettled();

        // Verify gift record has buyer_member_id populated
        const gift = await models.Gift.findOne({
            token: checkoutSession.metadata.gift_token
        }, {require: true});

        assert.equal(gift.get('buyer_email'), email);
        assert.equal(gift.get('buyer_member_id'), member.id);
        assert.equal(gift.get('cadence'), 'year');
        assert.equal(gift.get('amount'), paidTier.yearly_price);
        assert.equal(gift.get('status'), 'purchased');
    });

    it('Includes gift token in the purchase success URL', async function () {
        const paidTier = await getPaidTier();

        await membersAgent.post('/api/create-stripe-checkout-session/')
            .body({
                type: 'gift',
                tierId: paidTier.id,
                cadence: 'month',
                metadata: {}
            })
            .expectStatus(200);

        const checkoutSession = getLatestCheckoutSession();
        const successUrl = checkoutSession.success_url;

        assert.ok(successUrl, 'Should have a success URL');
        assert.ok(successUrl.includes('stripe=gift-purchase-success'), 'Success URL should contain stripe=gift-purchase-success');
        assert.ok(successUrl.includes(`gift_token=${checkoutSession.metadata.gift_token}`), 'Success URL should contain the gift token');
    });

    it('Handles Stripe webhook idempotency for gift purchases', async function () {
        const paidTier = await getPaidTier();

        await membersAgent.post('/api/create-stripe-checkout-session/')
            .body({
                type: 'gift',
                tierId: paidTier.id,
                cadence: 'month',
                metadata: {}
            })
            .expectStatus(200);

        const checkoutSession = getLatestCheckoutSession();

        const webhookData = {
            type: 'checkout.session.completed',
            data: {
                object: {
                    id: checkoutSession.id,
                    mode: 'payment',
                    amount_total: paidTier.monthly_price,
                    currency: paidTier.currency.toLowerCase(),
                    customer: checkoutSession.customer,
                    customer_details: {email: 'idempotent-buyer@example.com'},
                    metadata: toWebhookMetadata(checkoutSession.metadata),
                    payment_intent: 'pi_idempotent_test'
                }
            }
        };

        // Send the webhook twice
        await stripeMocker.sendWebhook(webhookData);
        await DomainEvents.allSettled();
        await stripeMocker.sendWebhook(webhookData);
        await DomainEvents.allSettled();

        // Verify only one gift record exists for this checkout session
        const gifts = await models.Gift.findAll({
            filter: `token:'${checkoutSession.metadata.gift_token}'`
        });

        assert.equal(gifts.length, 1, 'Should have exactly one gift record');
    });

    async function expectGiftCheckoutError(bodyOverrides = {}) {
        const paidTier = await getPaidTier();

        await membersAgent.post('/api/create-stripe-checkout-session/')
            .body({
                type: 'gift',
                tierId: paidTier.id,
                cadence: 'month',
                metadata: {},
                ...bodyOverrides
            })
            .expectStatus(400)
            .matchBodySnapshot({
                errors: [{id: anyErrorId}]
            });
    }

    it('Rejects purchase when labs flag is disabled', async function () {
        mockManager.mockLabsDisabled('giftSubscriptions');

        await expectGiftCheckoutError();
    });

    it('Rejects purchase with an offer', async function () {
        await expectGiftCheckoutError({
            offerId: 'some-offer-id'
        });
    });

    it('Marks gift as refunded when Stripe charge.refunded webhook is received', async function () {
        const paidTier = await getPaidTier();

        await membersAgent.post('/api/create-stripe-checkout-session/')
            .body({
                type: 'gift',
                tierId: paidTier.id,
                cadence: 'month',
                metadata: {}
            })
            .expectStatus(200);

        const checkoutSession = getLatestCheckoutSession();
        const paymentIntentId = 'pi_refund_test_789';

        // Complete the gift purchase via webhook
        await stripeMocker.sendWebhook({
            type: 'checkout.session.completed',
            data: {
                object: {
                    id: checkoutSession.id,
                    mode: 'payment',
                    amount_total: paidTier.monthly_price,
                    currency: paidTier.currency.toLowerCase(),
                    customer: checkoutSession.customer,
                    customer_details: {email: 'refund-buyer@example.com'},
                    metadata: toWebhookMetadata(checkoutSession.metadata),
                    payment_intent: paymentIntentId
                }
            }
        });

        await DomainEvents.allSettled();

        // Verify the gift was created
        const gift = await models.Gift.findOne({
            token: checkoutSession.metadata.gift_token
        }, {require: true});

        assert.equal(gift.get('status'), 'purchased');

        // Send charge.refunded webhook
        await stripeMocker.sendWebhook({
            type: 'charge.refunded',
            data: {
                object: {
                    id: 'ch_refund_test',
                    payment_intent: paymentIntentId,
                    invoice: null
                }
            }
        });

        await DomainEvents.allSettled();

        // Verify the gift is now refunded
        const refundedGift = await models.Gift.findOne({
            token: checkoutSession.metadata.gift_token
        }, {require: true});

        assert.equal(refundedGift.get('status'), 'refunded');
        assert.ok(refundedGift.get('refunded_at'));
    });

    it('Ignores Stripe charge.refunded webhook for non-gift charges', async function () {
        const paidTier = await getPaidTier();

        // Seed a gift to verify it is not affected
        const gift = await models.Gift.add({
            token: 'gift-ignore-non-gift',
            buyer_email: 'ignore-test@example.com',
            tier_id: paidTier.id,
            cadence: 'month',
            duration: 1,
            currency: 'usd',
            amount: 500,
            stripe_checkout_session_id: 'cs_ignore_non_gift',
            stripe_payment_intent_id: 'pi_ignore_non_gift',
            expires_at: new Date('2030-01-01T00:00:00.000Z'),
            status: 'purchased',
            purchased_at: new Date()
        });

        await stripeMocker.sendWebhook({
            type: 'charge.refunded',
            data: {
                object: {
                    id: 'ch_non_gift',
                    payment_intent: 'pi_non_gift_charge',
                    invoice: null
                }
            }
        });

        await DomainEvents.allSettled();

        const unchanged = await models.Gift.findOne({token: gift.get('token')}, {require: true});

        assert.equal(unchanged.get('status'), 'purchased');
        assert.equal(unchanged.get('refunded_at'), null);
    });

    it('Ignores Stripe charge.refunded webhook for subscription charges', async function () {
        const paidTier = await getPaidTier();

        // Seed a gift to verify it is not affected
        const gift = await models.Gift.add({
            token: 'gift-ignore-sub',
            buyer_email: 'ignore-sub-test@example.com',
            tier_id: paidTier.id,
            cadence: 'month',
            duration: 1,
            currency: 'usd',
            amount: 500,
            stripe_checkout_session_id: 'cs_ignore_sub',
            stripe_payment_intent_id: 'pi_ignore_sub',
            expires_at: new Date('2030-01-01T00:00:00.000Z'),
            status: 'purchased',
            purchased_at: new Date()
        });

        await stripeMocker.sendWebhook({
            type: 'charge.refunded',
            data: {
                object: {
                    id: 'ch_sub_refund',
                    payment_intent: 'pi_sub_charge',
                    invoice: 'in_123'
                }
            }
        });

        await DomainEvents.allSettled();

        const unchanged = await models.Gift.findOne({token: gift.get('token')}, {require: true});

        assert.equal(unchanged.get('status'), 'purchased');
        assert.equal(unchanged.get('refunded_at'), null);
    });
});
