const assert = require('node:assert/strict');
const DomainEvents = require('@tryghost/domain-events');
const {agentProvider, mockManager, fixtureManager, configUtils, matchers} = require('../../utils/e2e-framework');
const {stripeMocker} = require('../../utils/e2e-framework-mock-manager');
const models = require('../../../core/server/models');
const membersService = require('../../../core/server/services/members');
const urlUtils = require('../../../core/shared/url-utils');
const {anyErrorId} = matchers;

let membersAgent, adminAgent;
let paidProduct;
let giftSequence = 0;

const errorMessages = {
    alreadyRedeemed: 'This gift has already been redeemed.',
    expired: 'This gift has expired.',
    refunded: 'This gift has been refunded.',
    activeSubscription: 'You already have an active subscription.',
    notFound: 'This gift does not exist.'
};

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

function addYears(date, years) {
    const nextDate = new Date(date);
    nextDate.setFullYear(nextDate.getFullYear() + years);
    return nextDate;
}

async function createGift(overrides = {}) {
    giftSequence += 1;

    const sequence = giftSequence;
    const now = new Date('2026-04-07T10:00:00.000Z');
    const expiresAt = addYears(now, 10);

    return await models.Gift.add({
        token: `gift-token-${sequence}`,
        buyer_email: `gift-buyer-${sequence}@example.com`,
        buyer_member_id: null,
        redeemer_member_id: null,
        tier_id: paidProduct.id,
        cadence: 'year',
        duration: 1,
        currency: 'usd',
        amount: 5000,
        stripe_checkout_session_id: `cs_gift_${sequence}`,
        stripe_payment_intent_id: `pi_gift_${sequence}`,
        consumes_at: null,
        expires_at: expiresAt,
        status: 'purchased',
        purchased_at: now,
        redeemed_at: null,
        consumed_at: null,
        expired_at: null,
        refunded_at: null,
        ...overrides
    });
}

async function createCompedMemberAgent() {
    const agent = membersAgent.duplicate();
    const email = `gift-comped-${giftSequence + 1}@example.com`;

    await agent.loginAs(email);

    const member = await models.Member.findOne({email}, {require: true});

    await models.Member.edit({
        status: 'comped',
        products: [{
            id: paidProduct.id
        }]
    }, {
        id: member.id
    });

    return agent;
}

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

describe('Gift Subscriptions', function () {
    before(async function () {
        const agents = await agentProvider.getAgentsForMembers();

        membersAgent = agents.membersAgent;
        adminAgent = agents.adminAgent;

        await fixtureManager.init('members');
        await adminAgent.loginAsOwner();

        paidProduct = await models.Product.findOne({
            type: 'paid'
        }, {
            require: true,
            withRelated: ['benefits']
        });
    });

    beforeEach(function () {
        mockManager.mockStripe();
        mockManager.mockMail();
        mockManager.mockLabsEnabled('giftSubscriptions');
    });

    afterEach(async function () {
        await configUtils.restore();
        mockManager.restore();
    });

    describe('Purchase a gift', function () {
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

        it('Rejects purchase when labs flag is disabled', async function () {
            mockManager.mockLabsDisabled('giftSubscriptions');

            await expectGiftCheckoutError();
        });

        it('Rejects purchase with an offer', async function () {
            await expectGiftCheckoutError({
                offerId: 'some-offer-id'
            });
        });
    });

    describe('Refund a gift', function () {
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
                expires_at: addYears(new Date(), 10),
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
                expires_at: addYears(new Date(), 10),
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

    describe('Check if a gift is redeemable', function () {
        it('returns gift details for an anonymous visitor when the token is redeemable', async function () {
            const gift = await createGift();

            const {body} = await membersAgent
                .get(`/api/gifts/${gift.get('token')}/redeem/`)
                .expectStatus(200);

            assert.equal(body.gifts.length, 1);
            assert.equal(body.gifts[0].token, gift.get('token'));
            assert.equal(body.gifts[0].cadence, 'year');
            assert.equal(body.gifts[0].duration, 1);
            assert.equal(body.gifts[0].currency, 'usd');
            assert.equal(body.gifts[0].amount, 5000);
            assert.equal(body.gifts[0].expires_at, new Date(gift.get('expires_at')).toISOString());
            assert.deepEqual(body.gifts[0].tier, {
                id: paidProduct.id,
                name: paidProduct.get('name'),
                description: paidProduct.get('description'),
                benefits: paidProduct.related('benefits').toJSON().map(item => item.name)
            });
            assert.equal(body.gifts[0].buyer_email, undefined);
            assert.equal(body.gifts[0].redeemed_at, undefined);
            assert.equal(body.gifts[0].status, undefined);
            assert.equal(body.gifts[0].consumes_at, null);
        });

        it('returns gift details for a logged-in free member when the token is redeemable', async function () {
            const agent = membersAgent.duplicate();
            const gift = await createGift();

            await agent.loginAs(`gift-free-${giftSequence + 1}@example.com`);

            const {body} = await agent
                .get(`/api/gifts/${gift.get('token')}/redeem/`)
                .expectStatus(200);

            assert.equal(body.gifts[0].token, gift.get('token'));
        });

        it('returns 404 when the gift token does not exist', async function () {
            const {body} = await membersAgent
                .get('/api/gifts/nonexistent-token/redeem/')
                .expectStatus(404);

            assert.equal(body.errors[0].message, errorMessages.notFound);
        });

        it('returns 400 when the logged-in member already has a paid subscription', async function () {
            const agent = membersAgent.duplicate();
            const gift = await createGift();

            await agent.loginAs('paid@test.com');

            const {body} = await agent
                .get(`/api/gifts/${gift.get('token')}/redeem/`)
                .expectStatus(400);

            assert.equal(body.errors[0].message, errorMessages.activeSubscription);
        });

        it('returns 400 when the logged-in member already has a comped subscription', async function () {
            const agent = await createCompedMemberAgent();
            const gift = await createGift();

            const {body} = await agent
                .get(`/api/gifts/${gift.get('token')}/redeem/`)
                .expectStatus(400);

            assert.equal(body.errors[0].message, errorMessages.activeSubscription);
        });

        it('returns 400 when the gift is already redeemed', async function () {
            const gift = await createGift({
                status: 'redeemed',
                redeemed_at: new Date('2026-04-08T10:00:00.000Z'),
                redeemer_member_id: null
            });

            const {body} = await membersAgent
                .get(`/api/gifts/${gift.get('token')}/redeem/`)
                .expectStatus(400);

            assert.equal(body.errors[0].message, errorMessages.alreadyRedeemed);
        });

        it('returns 400 when the gift is expired', async function () {
            const gift = await createGift({
                status: 'expired',
                expired_at: new Date('2026-04-08T10:00:00.000Z'),
                expires_at: new Date('2026-04-08T10:00:00.000Z')
            });

            const {body} = await membersAgent
                .get(`/api/gifts/${gift.get('token')}/redeem/`)
                .expectStatus(400);

            assert.equal(body.errors[0].message, errorMessages.expired);
        });

        it('returns 400 when the gift is refunded', async function () {
            const gift = await createGift({
                status: 'refunded',
                refunded_at: new Date('2026-04-08T10:00:00.000Z')
            });

            const {body} = await membersAgent
                .get(`/api/gifts/${gift.get('token')}/redeem/`)
                .expectStatus(400);

            assert.equal(body.errors[0].message, errorMessages.refunded);
        });
    });

    describe('Redeem a gift', function () {
        describe('Logged-in member (immediate gift redemption)', function () {
            it('redeems a gift for a logged-in free member', async function () {
                const agent = membersAgent.duplicate();
                const email = `gift-post-free-${giftSequence + 1}@example.com`;
                const gift = await createGift();

                await agent.loginAs(email);

                const {body} = await agent
                    .post(`/api/gifts/${gift.get('token')}/redeem/`)
                    .body({})
                    .expectStatus(200);

                await DomainEvents.allSettled();

                await gift.refresh();

                const member = await models.Member.findOne({email}, {require: true});

                assert.equal(body.gifts[0].token, gift.get('token'));
                assert.equal(body.gifts[0].status, undefined);
                assert.ok(body.gifts[0].consumes_at);
                assert.equal(member.get('status'), 'gift');
                assert.equal(gift.get('status'), 'redeemed');
                assert.equal(gift.get('redeemer_member_id'), member.id);
                assert.ok(gift.get('redeemed_at'));
                assert.ok(gift.get('consumes_at'));

                const memberResponse = await agent
                    .get('/api/member/')
                    .expectStatus(200);

                assert.equal(memberResponse.body.status, 'gift');
                assert.equal(
                    memberResponse.body.subscriptions.length,
                    1,
                    'Gift members should receive a synthetic gift subscription in the member API'
                );
                assert.equal(
                    memberResponse.body.subscriptions[0].tier.id,
                    paidProduct.id,
                    'The gift subscription should point at the redeemed tier'
                );
                assert.equal(
                    memberResponse.body.subscriptions[0].plan.nickname,
                    'Gift subscription',
                    'The synthetic subscription plan should be marked as a gift'
                );
                assert.equal(
                    memberResponse.body.subscriptions[0].price.nickname,
                    'Gift subscription',
                    'The synthetic subscription price should be marked as a gift'
                );
                assert.equal(
                    memberResponse.body.subscriptions[0].plan.currency.toLowerCase(),
                    paidProduct.get('currency').toLowerCase(),
                    'The gift subscription plan should reuse the tier currency'
                );
                assert.equal(
                    memberResponse.body.subscriptions[0].price.currency.toLowerCase(),
                    paidProduct.get('currency').toLowerCase(),
                    'The gift subscription price should reuse the tier currency'
                );

                // Verify staff notification email was sent
                mockManager.assert.sentEmail({
                    subject: /new paid subscriber/i,
                    to: 'jbloggs@example.com'
                });
            });

            it('returns 401 when redeeming a gift without being logged in', async function () {
                const gift = await createGift();

                const {body} = await membersAgent
                    .post(`/api/gifts/${gift.get('token')}/redeem/`)
                    .body({})
                    .expectStatus(401);

                assert.equal(body.errors[0].type, 'UnauthorizedError');
            });

            it('returns 400 when redeeming a gift for a paid member', async function () {
                const agent = membersAgent.duplicate();
                const gift = await createGift();

                await agent.loginAs('paid@test.com');

                const {body} = await agent
                    .post(`/api/gifts/${gift.get('token')}/redeem/`)
                    .body({})
                    .expectStatus(400);

                assert.equal(body.errors[0].message, errorMessages.activeSubscription);
            });

            it('returns 400 when redeeming a gift a second time', async function () {
                const firstAgent = membersAgent.duplicate();
                const secondAgent = membersAgent.duplicate();
                const firstEmail = `gift-post-first-${giftSequence + 1}@example.com`;
                const secondEmail = `gift-post-second-${giftSequence + 2}@example.com`;
                const gift = await createGift();

                await firstAgent.loginAs(firstEmail);
                await firstAgent
                    .post(`/api/gifts/${gift.get('token')}/redeem/`)
                    .body({})
                    .expectStatus(200);

                await secondAgent.loginAs(secondEmail);

                const {body} = await secondAgent
                    .post(`/api/gifts/${gift.get('token')}/redeem/`)
                    .body({})
                    .expectStatus(400);

                assert.equal(body.errors[0].message, errorMessages.alreadyRedeemed);
            });

            it('only redeems a gift once when two members redeem concurrently', async function () {
                const firstAgent = membersAgent.duplicate();
                const secondAgent = membersAgent.duplicate();
                const firstEmail = `gift-concurrent-first-${giftSequence + 1}@example.com`;
                const secondEmail = `gift-concurrent-second-${giftSequence + 2}@example.com`;
                const gift = await createGift();
                const redeemPath = `/api/gifts/${gift.get('token')}/redeem/`;

                await firstAgent.loginAs(firstEmail);
                await secondAgent.loginAs(secondEmail);

                const settledResults = await Promise.allSettled([
                    firstAgent.post(redeemPath).body({}),
                    secondAgent.post(redeemPath).body({})
                ]);

                assert.equal(settledResults[0].status, 'fulfilled');
                assert.equal(settledResults[1].status, 'fulfilled');

                const responses = settledResults.map(result => result.value);
                const statusCodes = responses.map(response => response.statusCode).sort((a, b) => a - b);
                const successResponses = responses.filter(response => response.statusCode === 200);
                const failureResponses = responses.filter(response => response.statusCode === 400);

                assert.deepEqual(statusCodes, [200, 400]);
                assert.equal(successResponses.length, 1);
                assert.equal(failureResponses.length, 1);
                assert.equal(failureResponses[0].body.errors[0].message, errorMessages.alreadyRedeemed);

                await gift.refresh();

                const firstMember = await models.Member.findOne({email: firstEmail}, {require: true, withRelated: ['products']});
                const secondMember = await models.Member.findOne({email: secondEmail}, {require: true, withRelated: ['products']});
                const giftMembers = [firstMember, secondMember].filter(member => member.get('status') === 'gift');
                const freeMembers = [firstMember, secondMember].filter(member => member.get('status') === 'free');

                assert.equal(gift.get('status'), 'redeemed');
                assert.ok(gift.get('redeemed_at'));
                assert.ok(gift.get('consumes_at'));
                assert.equal(giftMembers.length, 1);
                assert.equal(freeMembers.length, 1);
                assert.equal(giftMembers[0].related('products').length, 1);
                assert.equal(giftMembers[0].related('products').models[0].id, paidProduct.id);
                assert.equal(freeMembers[0].related('products').length, 0);
                assert.equal(gift.get('redeemer_member_id'), giftMembers[0].id);
            });
        });

        describe('Anonymous visitor (gift redemption via magic link)', function () {
            describe('New member', function () {
                it('signs up and redeems a gift during magic link confirmation', async function () {
                    const email = 'gift-redemption-member@test.com';
                    const gift = await createGift();
                    const originalWelcomePageUrl = paidProduct.get('welcome_page_url');
                    const redirectUrl = new URL(urlUtils.getSiteUrl());
                    redirectUrl.hash = '#/portal/account?giftRedemption=true';

                    // Verify the member does not exist before the magic link flow
                    const existingMember = await models.Member.findOne({email}, {require: false});
                    assert.equal(existingMember, null, 'Member should not exist before magic link confirmation');

                    // Set up an active free welcome email automation so the test would catch
                    // any regression that re-introduces the spurious automation run for gift members
                    const emailDesignSetting = await models.EmailDesignSetting.findOne(
                        {slug: 'default-automated-email'},
                        {require: true}
                    );
                    const welcomeEmailAutomation = await models.WelcomeEmailAutomation.add({
                        name: 'Free welcome email',
                        slug: 'member-welcome-email-free',
                        status: 'active'
                    });
                    await models.WelcomeEmailAutomatedEmail.add({
                        welcome_email_automation_id: welcomeEmailAutomation.id,
                        delay_days: 0,
                        subject: 'Welcome to the site!',
                        lexical: JSON.stringify({root: {children: [{type: 'paragraph', children: [{text: 'Welcome'}]}]}}),
                        email_design_setting_id: emailDesignSetting.id
                    });

                    try {
                        await models.Product.edit({
                            welcome_page_url: ''
                        }, {
                            id: paidProduct.id
                        });

                        const magicLink = await membersService.api.getMagicLink(email, 'subscribe', {
                            giftToken: gift.get('token'),
                            name: 'Gift Receiver'
                        });
                        const token = new URL(magicLink).searchParams.get('token');

                        const res = await membersAgent.get(`/?token=${token}&action=subscribe&r=${encodeURIComponent(redirectUrl.href)}`)
                            .expectStatus(302)
                            .expectHeader('Set-Cookie', /members-ssr.*/);

                        const location = new URL(res.headers.location, urlUtils.getSiteUrl());
                        const [hashPath, hashQueryString] = location.hash.slice(1).split('?');
                        const hashParams = new URLSearchParams(hashQueryString);

                        await DomainEvents.allSettled();

                        // Verify a new member was created with status 'gift'
                        const member = await models.Member.findOne({email}, {require: true});
                        assert.equal(member.get('name'), 'Gift Receiver');
                        assert.equal(member.get('email'), email);
                        assert.equal(member.get('status'), 'gift');

                        // Verify the gift was redeemed
                        await gift.refresh();
                        assert.equal(gift.get('status'), 'redeemed');
                        assert.equal(gift.get('redeemer_member_id'), member.id);
                        assert.ok(gift.get('redeemed_at'));
                        assert.ok(gift.get('consumes_at'));

                        // Verify the free welcome automation did NOT enqueue a run for this gift member
                        const welcomeRuns = await models.WelcomeEmailAutomationRun.findAll({
                            filter: `member_id:'${member.id}'`
                        });
                        assert.equal(welcomeRuns.length, 0, 'Should not enqueue free welcome email automation for gift member');

                        // Verify gift subscription started staff notification was sent,
                        // and that no other unwanted staff notifications were sent (i.e. no "Free member signup" email)
                        mockManager.assert.sentEmail({
                            subject: /new paid subscriber/i,
                            to: 'jbloggs@example.com'
                        });
                        mockManager.assert.sentEmailCount(1);

                        // Verify the redirect URL was used
                        assert.equal(location.searchParams.get('action'), 'subscribe');
                        assert.equal(location.searchParams.get('success'), 'true');
                        assert.equal(hashPath, '/portal/account');
                        assert.equal(hashParams.get('giftRedemption'), 'true');
                    } finally {
                        await models.Product.edit({
                            welcome_page_url: originalWelcomePageUrl
                        }, {
                            id: paidProduct.id
                        });
                        await models.WelcomeEmailAutomation.destroy({id: welcomeEmailAutomation.id});
                    }
                });
            });

            describe('Existing member', function () {
                it('signs in and redeems a gift during magic link confirmation', async function () {
                    const email = 'gift-existing-member@test.com';

                    // Create member first
                    await models.Member.add({email, name: 'Existing Member', email_disabled: false});
                    await DomainEvents.allSettled();

                    const gift = await createGift();
                    const originalWelcomePageUrl = paidProduct.get('welcome_page_url');
                    const redirectUrl = new URL(urlUtils.getSiteUrl());
                    redirectUrl.hash = '#/portal/account?giftRedemption=true';

                    try {
                        await models.Product.edit({
                            welcome_page_url: ''
                        }, {
                            id: paidProduct.id
                        });

                        const magicLink = await membersService.api.getMagicLink(email, 'subscribe', {
                            giftToken: gift.get('token')
                        });
                        const token = new URL(magicLink).searchParams.get('token');

                        const res = await membersAgent.get(`/?token=${token}&action=subscribe&r=${encodeURIComponent(redirectUrl.href)}`)
                            .expectStatus(302)
                            .expectHeader('Set-Cookie', /members-ssr.*/);

                        const location = new URL(res.headers.location, urlUtils.getSiteUrl());

                        const [hashPath, hashQueryString] = location.hash.slice(1).split('?');
                        const hashParams = new URLSearchParams(hashQueryString);

                        await DomainEvents.allSettled();

                        // Verify the member has now status "gift"
                        const member = await models.Member.findOne({email}, {require: true});
                        assert.equal(member.get('status'), 'gift');
                        assert.equal(member.get('name'), 'Existing Member'); // Original name

                        // Verify the gift was redeemed
                        await gift.refresh();
                        assert.equal(gift.get('status'), 'redeemed');
                        assert.equal(gift.get('redeemer_member_id'), member.id);
                        assert.ok(gift.get('redeemed_at'));
                        assert.ok(gift.get('consumes_at'));

                        // Verify gift subscription started staff notification was sent
                        mockManager.assert.sentEmail({
                            subject: /new paid subscriber/i,
                            to: 'jbloggs@example.com'
                        });

                        // Verify the redirect URL was used
                        assert.equal(location.searchParams.get('action'), 'subscribe');
                        assert.equal(location.searchParams.get('success'), 'true');
                        assert.equal(hashPath, '/portal/account');
                        assert.equal(hashParams.get('giftRedemption'), 'true');
                    } finally {
                        await models.Product.edit({
                            welcome_page_url: originalWelcomePageUrl
                        }, {
                            id: paidProduct.id
                        });
                    }
                });
            });

            it('fails gift redemption on a second magic link exchange attempt', async function () {
                const firstEmail = 'gift-magic-first@test.com';
                const secondEmail = 'gift-magic-second@test.com';
                const gift = await createGift();
                const originalWelcomePageUrl = paidProduct.get('welcome_page_url');
                const redirectUrl = new URL(urlUtils.getSiteUrl());
                redirectUrl.hash = '#/portal/account?giftRedemption=true';

                try {
                    await models.Product.edit({
                        welcome_page_url: ''
                    }, {
                        id: paidProduct.id
                    });

                    // Create two magic links for two different members, both with the same gift token
                    const firstMagicLink = await membersService.api.getMagicLink(firstEmail, 'subscribe', {
                        giftToken: gift.get('token'),
                        name: 'First Redeemer'
                    });
                    const firstToken = new URL(firstMagicLink).searchParams.get('token');

                    const secondMagicLink = await membersService.api.getMagicLink(secondEmail, 'subscribe', {
                        giftToken: gift.get('token'),
                        name: 'Second Redeemer'
                    });
                    const secondToken = new URL(secondMagicLink).searchParams.get('token');

                    // First member redeems the gift successfully
                    const firstRes = await membersAgent.get(`/?token=${firstToken}&action=subscribe&r=${encodeURIComponent(redirectUrl.href)}`)
                        .expectStatus(302)
                        .expectHeader('Set-Cookie', /members-ssr.*/);

                    const firstLocation = new URL(firstRes.headers.location, urlUtils.getSiteUrl());
                    assert.equal(firstLocation.searchParams.get('success'), 'true');

                    await gift.refresh();
                    const firstMember = await models.Member.findOne({email: firstEmail}, {require: true});
                    assert.equal(gift.get('status'), 'redeemed');
                    assert.equal(gift.get('redeemer_member_id'), firstMember.id);

                    // Second member tries to redeem the same gift — should fail
                    const secondRes = await membersAgent.get(`/?token=${secondToken}&action=subscribe&r=${encodeURIComponent(redirectUrl.href)}`)
                        .expectStatus(302);

                    const secondLocation = new URL(secondRes.headers.location, urlUtils.getSiteUrl());
                    assert.equal(secondLocation.searchParams.get('success'), 'false');

                    // Verify the gift was not re-assigned to the second member
                    await gift.refresh();
                    assert.equal(gift.get('status'), 'redeemed');
                    assert.equal(gift.get('redeemer_member_id'), firstMember.id);
                } finally {
                    await models.Product.edit({
                        welcome_page_url: originalWelcomePageUrl
                    }, {
                        id: paidProduct.id
                    });
                }
            });
        });
    });
});
