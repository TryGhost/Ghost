const querystring = require('querystring');
const {agentProvider, mockManager, fixtureManager, matchers} = require('../../utils/e2e-framework');
const nock = require('nock');
const should = require('should');
const models = require('../../../core/server/models');
const urlService = require('../../../core/server/services/url');

let membersAgent, adminAgent;

async function getPost(id) {
    // eslint-disable-next-line dot-notation
    return await models['Post'].where('id', id).fetch({require: true});
}

// ============================================================================
// Stripe Mock Response Helpers
// ============================================================================

/**
 * Parse Stripe API endpoint to extract resource type and ID
 * @param {string} uri - The URI to parse (e.g., '/v1/products/prod_123')
 * @returns {{resource: string, id: string} | null} Parsed resource info or null
 */
function parseStripeEndpoint(uri) {
    const [match, resource, id] = uri.match(/\/v1\/(\w+)\/(.+)\/?/) || [null];
    if (!match) {
        return null;
    }
    return {resource, id};
}

/**
 * Create a standard Stripe GET response handler
 * @param {Object} options - Response options
 * @param {number} [options.priceAmount=500] - Price amount in cents
 * @param {string} [options.interval='month'] - Subscription interval
 * @returns {Function} Nock reply function
 */
function createStripeGetHandler(options = {}) {
    return function (/** @type {string} */ uri) {
        const parsed = parseStripeEndpoint(uri);
        if (!parsed) {
            return [500];
        }

        const {resource, id} = parsed;

        if (resource === 'products') {
            return [200, {
                id: id,
                active: true
            }];
        }

        if (resource === 'prices') {
            return [200, {
                id: id,
                active: true,
                currency: 'usd',
                unit_amount: options.priceAmount || 500,
                recurring: {
                    interval: options.interval || 'month'
                }
            }];
        }

        return [500];
    };
}

/**
 * Create a standard Stripe POST response handler
 * @param {Object} options - Response options
 * @param {string} [options.checkoutSessionId='cs_123'] - Checkout session ID
 * @param {string} [options.checkoutSessionUrl='https://site.com'] - Checkout session URL
 * @param {string} [options.priceId] - Price ID for created prices
 * @param {boolean} [options.includeCoupon=false] - Whether to handle coupon creation
 * @param {number} [options.priceAmount=500] - Price amount in cents
 * @param {string} [options.interval='month'] - Subscription interval
 * @param {Function} [options.onCheckoutSession] - Custom handler for checkout session (receives body, returns response)
 * @returns {Function} Nock reply function
 */
function createStripePostHandler(options = {}) {
    return function (/** @type {string} */ uri, /** @type {string} */ body) {
        if (uri === '/v1/checkout/sessions') {
            if (options.onCheckoutSession) {
                return options.onCheckoutSession(body);
            }
            return [200, {
                id: options.checkoutSessionId || 'cs_123',
                url: options.checkoutSessionUrl || 'https://site.com'
            }];
        }

        if (uri === '/v1/coupons' && options.includeCoupon) {
            return [200, {id: 'coupon_123'}];
        }

        if (uri === '/v1/prices') {
            return [200, {
                id: options.priceId || 'price_created',
                active: true,
                currency: 'usd',
                unit_amount: options.priceAmount || 500,
                recurring: {
                    interval: options.interval || 'month'
                }
            }];
        }

        return [500];
    };
}

describe('Create Stripe Checkout Session', function () {
    before(async function () {
        const agents = await agentProvider.getAgentsForMembers();
        membersAgent = agents.membersAgent;
        adminAgent = agents.adminAgent;

        await fixtureManager.init('posts', 'members');
        await adminAgent.loginAsOwner();
    });

    beforeEach(function () {
        mockManager.mockMail();
    });

    afterEach(function () {
        mockManager.restore();
    });

    it('Does not allow to create a checkout session if the customerEmail is associated with a paid member', async function () {
        const {body: {tiers}} = await adminAgent.get('/tiers/?include=monthly_price&yearly_price');

        const paidTier = tiers.find(tier => tier.type === 'paid');

        await membersAgent.post('/api/create-stripe-checkout-session/')
            .body({
                customerEmail: 'paid@test.com',
                tierId: paidTier.id,
                cadence: 'month'
            })
            .expectStatus(403)
            .matchBodySnapshot({
                errors: [{
                    id: matchers.anyUuid,
                    code: 'CANNOT_CHECKOUT_WITH_EXISTING_SUBSCRIPTION'
                }]
            })
            .matchHeaderSnapshot({
                etag: matchers.anyEtag
            });
    });

    it('Can create a checkout session when using offers', async function () {
        const {body: {tiers}} = await adminAgent.get('/tiers/?include=monthly_price&yearly_price');
        const paidTier = tiers.find(tier => tier.type === 'paid');
        const {body: {offers: [offer]}} = await adminAgent.post('/offers/').body({
            offers: [{
                name: 'Test Offer',
                code: 'test-offer',
                cadence: 'month',
                status: 'active',
                currency: 'usd',
                type: 'percent',
                amount: 20,
                duration: 'once',
                duration_in_months: null,
                display_title: 'Test Offer',
                display_description: null,
                tier: {
                    id: paidTier.id
                }
            }]
        });

        nock('https://api.stripe.com')
            .persist()
            .get(/v1\/.*/)
            .reply(createStripeGetHandler());

        nock('https://api.stripe.com')
            .persist()
            .post(/v1\/.*/)
            .reply(createStripePostHandler({
                priceId: 'price_1',
                includeCoupon: true
            }));

        await membersAgent.post('/api/create-stripe-checkout-session/')
            .body({
                customerEmail: 'free@test.com',
                offerId: offer.id
            })
            .expectStatus(200)
            .matchBodySnapshot()
            .matchHeaderSnapshot();
    });

    it('Can create a checkout session without passing a customerEmail', async function () {
        const {body: {tiers}} = await adminAgent.get('/tiers/?include=monthly_price&yearly_price');

        const paidTier = tiers.find(tier => tier.type === 'paid');

        nock('https://api.stripe.com')
            .persist()
            .get(/v1\/.*/)
            .reply(createStripeGetHandler());

        nock('https://api.stripe.com')
            .persist()
            .post(/v1\/.*/)
            .reply(createStripePostHandler({
                priceId: 'price_2',
                onCheckoutSession: function (body) {
                    const bodyJSON = querystring.parse(body);
                    // TODO: Actually work out what Stripe checks and when/how it errors
                    if (Reflect.has(bodyJSON, 'customerEmail')) {
                        return [400, {error: 'Invalid Email'}];
                    }
                    return [200, {id: 'cs_123', url: 'https://site.com'}];
                }
            }));

        await membersAgent.post('/api/create-stripe-checkout-session/')
            .body({
                tierId: paidTier.id,
                cadence: 'month'
            })
            .expectStatus(200)
            .matchBodySnapshot()
            .matchHeaderSnapshot();
    });
    it('Does allow to create a checkout session if the customerEmail is not associated with a paid member', async function () {
        const {body: {tiers}} = await adminAgent.get('/tiers/?include=monthly_price&yearly_price');

        const paidTier = tiers.find(tier => tier.type === 'paid');

        nock('https://api.stripe.com')
            .persist()
            .get(/v1\/.*/)
            .reply(createStripeGetHandler());

        nock('https://api.stripe.com')
            .persist()
            .post(/v1\/.*/)
            .reply(createStripePostHandler({
                priceId: 'price_3'
            }));

        await membersAgent.post('/api/create-stripe-checkout-session/')
            .body({
                customerEmail: 'free@test.com',
                tierId: paidTier.id,
                cadence: 'month'
            })
            .expectStatus(200)
            .matchBodySnapshot()
            .matchHeaderSnapshot();
    });

    /**
     * When a checkout session is created with an urlHistory, we should convert it to an
     * attribution and check if that is set in the metadata of the stripe session
     */
    describe('Member attribution', function () {
        it('Does pass url attribution source to session metadata', async function () {
            const {body: {tiers}} = await adminAgent.get('/tiers/?include=monthly_price&yearly_price');

            const paidTier = tiers.find(tier => tier.type === 'paid');

            nock('https://api.stripe.com')
                .persist()
                .get(/v1\/.*/)
                .reply(createStripeGetHandler());

            const scope = nock('https://api.stripe.com')
                .persist()
                .post(/v1\/.*/)
                .reply(createStripePostHandler({
                    priceId: 'price_4',
                    onCheckoutSession: function (body) {
                        const parsed = new URLSearchParams(body);
                        should(parsed.get('metadata[attribution_url]')).eql('/test');
                        should(parsed.get('metadata[attribution_type]')).eql('url');
                        should(parsed.get('metadata[attribution_id]')).be.null();

                        return [200, {id: 'cs_123', url: 'https://site.com'}];
                    }
                }));

            await membersAgent.post('/api/create-stripe-checkout-session/')
                .body({
                    customerEmail: 'attribution@test.com',
                    tierId: paidTier.id,
                    cadence: 'month',
                    metadata: {
                        urlHistory: [
                            {
                                path: '/test',
                                time: Date.now()
                            }
                        ]
                    }
                })
                .expectStatus(200)
                .matchBodySnapshot()
                .matchHeaderSnapshot();

            should(scope.isDone()).eql(true);
        });

        it('Does pass post attribution source to session metadata', async function () {
            const post = await getPost(fixtureManager.get('posts', 0).id);
            const url = urlService.getUrlByResourceId(post.id, {absolute: false});

            const {body: {tiers}} = await adminAgent.get('/tiers/?include=monthly_price&yearly_price');

            const paidTier = tiers.find(tier => tier.type === 'paid');

            nock('https://api.stripe.com')
                .persist()
                .get(/v1\/.*/)
                .reply(createStripeGetHandler({priceAmount: 50}));

            const scope = nock('https://api.stripe.com')
                .persist()
                .post(/v1\/.*/)
                .reply(createStripePostHandler({
                    priceId: 'price_5',
                    onCheckoutSession: function (body) {
                        const parsed = new URLSearchParams(body);
                        should(parsed.get('metadata[attribution_url]')).eql(url);
                        should(parsed.get('metadata[attribution_type]')).eql('post');
                        should(parsed.get('metadata[attribution_id]')).eql(post.id);

                        return [200, {id: 'cs_123', url: 'https://site.com'}];
                    }
                }));

            await membersAgent.post('/api/create-stripe-checkout-session/')
                .body({
                    customerEmail: 'attribution-post@test.com',
                    tierId: paidTier.id,
                    cadence: 'month',
                    metadata: {
                        urlHistory: [
                            {
                                path: url,
                                time: Date.now()
                            }
                        ]
                    }
                })
                .expectStatus(200)
                .matchBodySnapshot()
                .matchHeaderSnapshot();

            should(scope.isDone()).eql(true);
        });

        it('Ignores attribution_* values in metadata', async function () {
            const {body: {tiers}} = await adminAgent.get('/tiers/?include=monthly_price&yearly_price');

            const paidTier = tiers.find(tier => tier.type === 'paid');

            nock('https://api.stripe.com')
                .persist()
                .get(/v1\/.*/)
                .reply(createStripeGetHandler());

            const scope = nock('https://api.stripe.com')
                .persist()
                .post(/v1\/.*/)
                .reply(createStripePostHandler({
                    priceId: 'price_6',
                    onCheckoutSession: function (body) {
                        const parsed = new URLSearchParams(body);
                        should(parsed.get('metadata[attribution_url]')).be.null();
                        should(parsed.get('metadata[attribution_type]')).be.null();
                        should(parsed.get('metadata[attribution_id]')).be.null();

                        return [200, {id: 'cs_123', url: 'https://site.com'}];
                    }
                }));

            await membersAgent.post('/api/create-stripe-checkout-session/')
                .body({
                    customerEmail: 'attribution-2@test.com',
                    tierId: paidTier.id,
                    cadence: 'month',
                    metadata: {
                        attribution_type: 'url',
                        attribution_url: '/',
                        attribution_id: null
                    }
                })
                .expectStatus(200)
                .matchBodySnapshot()
                .matchHeaderSnapshot();

            should(scope.isDone()).eql(true);
        });
    });

    /**
     * Newsletter preference tests
     */
    describe('Newsletter preferences', function () {
        it('Should not pass newsletter data to Stripe metadata but include in success URL token', async function () {
            const {body: {tiers}} = await adminAgent.get('/tiers/?include=monthly_price&yearly_price');
            const paidTier = tiers.find(tier => tier.type === 'paid');

            let stripeSessionMetadata;

            nock('https://api.stripe.com')
                .persist()
                .get(/v1\/.*/)
                .reply(createStripeGetHandler());

            nock('https://api.stripe.com')
                .persist()
                .post(/v1\/.*/)
                .reply(createStripePostHandler({
                    priceId: 'price_newsletter',
                    checkoutSessionId: 'cs_123',
                    checkoutSessionUrl: 'https://checkout.stripe.com/session/cs_123',
                    onCheckoutSession: function (body) {
                        // Capture the metadata sent to Stripe
                        const params = new URLSearchParams(body);
                        stripeSessionMetadata = {};
                        for (const [key, value] of params.entries()) {
                            if (key.startsWith('metadata[')) {
                                const metaKey = key.match(/metadata\[([^\]]+)\]/)[1];
                                stripeSessionMetadata[metaKey] = value;
                            }
                        }

                        return [200, {
                            id: 'cs_123',
                            url: 'https://checkout.stripe.com/session/cs_123'
                        }];
                    }
                }));

            await membersAgent.post('/api/create-stripe-checkout-session/')
                .body({
                    customerEmail: 'newsletter-test@test.com',
                    tierId: paidTier.id,
                    cadence: 'month',
                    metadata: {
                        newsletters: JSON.stringify([])
                    }
                })
                .expectStatus(200);

            // Verify that newsletters were NOT sent to Stripe metadata
            should(stripeSessionMetadata).not.have.property('newsletters');
        });

        it('Should handle empty newsletter array without sending to Stripe', async function () {
            const {body: {tiers}} = await adminAgent.get('/tiers/?include=monthly_price&yearly_price');
            const paidTier = tiers.find(tier => tier.type === 'paid');

            let stripeSessionMetadata;

            nock('https://api.stripe.com')
                .persist()
                .get(/v1\/.*/)
                .reply(createStripeGetHandler());

            nock('https://api.stripe.com')
                .persist()
                .post(/v1\/.*/)
                .reply(createStripePostHandler({
                    priceId: 'price_empty_newsletter',
                    checkoutSessionId: 'cs_456',
                    checkoutSessionUrl: 'https://checkout.stripe.com/session/cs_456',
                    onCheckoutSession: function (body) {
                        // Capture the metadata sent to Stripe
                        const params = new URLSearchParams(body);
                        stripeSessionMetadata = {};
                        for (const [key, value] of params.entries()) {
                            if (key.startsWith('metadata[')) {
                                const metaKey = key.match(/metadata\[([^\]]+)\]/)[1];
                                stripeSessionMetadata[metaKey] = value;
                            }
                        }

                        return [200, {
                            id: 'cs_456',
                            url: 'https://checkout.stripe.com/session/cs_456'
                        }];
                    }
                }));

            await membersAgent.post('/api/create-stripe-checkout-session/')
                .body({
                    customerEmail: 'no-newsletter@test.com',
                    tierId: paidTier.id,
                    cadence: 'month',
                    metadata: {
                        newsletters: JSON.stringify([])
                    }
                })
                .expectStatus(200);

            // Verify that newsletters were NOT sent to Stripe metadata
            should(stripeSessionMetadata).not.have.property('newsletters');
        });
    });
});
