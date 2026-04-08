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
                customerEmail: 'gift-buyer@example.com',
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
        assert.equal(checkoutSession.metadata.buyer_email, 'gift-buyer@example.com');
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
                customerEmail: email,
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

    it('Handles Stripe webhook idempotency', async function () {
        const paidTier = await getPaidTier();

        await membersAgent.post('/api/create-stripe-checkout-session/')
            .body({
                type: 'gift',
                tierId: paidTier.id,
                cadence: 'month',
                customerEmail: 'idempotent-buyer@example.com',
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
                customerEmail: 'test-buyer@example.com',
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

        await expectGiftCheckoutError({customerEmail: 'rejected-buyer@example.com'});
    });

    it('Rejects purchase with an offer', async function () {
        await expectGiftCheckoutError({
            customerEmail: 'offer-buyer@example.com',
            offerId: 'some-offer-id'
        });
    });

    it('Rejects purchase without a valid email', async function () {
        await expectGiftCheckoutError({customerEmail: 'not-an-email'});
    });

    it('Includes gift token in the success URL', async function () {
        const paidTier = await getPaidTier();

        await membersAgent.post('/api/create-stripe-checkout-session/')
            .body({
                type: 'gift',
                tierId: paidTier.id,
                cadence: 'month',
                customerEmail: 'url-test-buyer@example.com',
                metadata: {}
            })
            .expectStatus(200);

        const checkoutSession = getLatestCheckoutSession();
        const successUrl = checkoutSession.success_url;

        assert.ok(successUrl, 'Should have a success URL');
        assert.ok(successUrl.includes('stripe=gift-purchase-success'), 'Success URL should contain stripe=gift-purchase-success');
        assert.ok(successUrl.includes(`gift_token=${checkoutSession.metadata.gift_token}`), 'Success URL should contain the gift token');
    });
});
