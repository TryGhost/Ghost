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
            .reply((uri) => {
                const [match, resource, id] = uri.match(/\/v1\/(\w+)\/(.+)\/?/) || [null];
                if (match) {
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
                            unit_amount: 500,
                            recurring: {
                                interval: 'month'
                            }
                        }];
                    }
                }

                return [500];
            });

        nock('https://api.stripe.com')
            .persist()
            .post(/v1\/.*/)
            .reply((uri) => {
                if (uri === '/v1/checkout/sessions') {
                    return [200, {id: 'cs_123', url: 'https://site.com'}];
                }

                if (uri === '/v1/coupons') {
                    return [200, {id: 'coupon_123'}];
                }

                if (uri === '/v1/prices') {
                    return [200, {
                        id: 'price_1',
                        active: true,
                        currency: 'usd',
                        unit_amount: 500,
                        recurring: {
                            interval: 'month'
                        }
                    }];
                }

                return [500];
            });

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
            .reply((uri) => {
                const [match, resource, id] = uri.match(/\/v1\/(\w+)\/(.+)\/?/) || [null];
                if (match) {
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
                            unit_amount: 500,
                            recurring: {
                                interval: 'month'
                            }
                        }];
                    }
                }

                return [500];
            });

        nock('https://api.stripe.com')
            .persist()
            .post(/v1\/.*/)
            .reply((uri, body) => {
                if (uri === '/v1/checkout/sessions') {
                    const bodyJSON = querystring.parse(body);
                    // TODO: Actually work out what Stripe checks and when/how it errors
                    if (Reflect.has(bodyJSON, 'customerEmail')) {
                        return [400, {error: 'Invalid Email'}];
                    }
                    return [200, {id: 'cs_123', url: 'https://site.com'}];
                }

                if (uri === '/v1/prices') {
                    return [200, {
                        id: 'price_2',
                        active: true,
                        currency: 'usd',
                        unit_amount: 500,
                        recurring: {
                            interval: 'month'
                        }
                    }];
                }

                return [500];
            });

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
            .reply((uri) => {
                const [match, resource, id] = uri.match(/\/v1\/(\w+)\/(.+)\/?/) || [null];
                if (match) {
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
                            unit_amount: 500,
                            recurring: {
                                interval: 'month'
                            }
                        }];
                    }
                }

                return [500];
            });

        nock('https://api.stripe.com')
            .persist()
            .post(/v1\/.*/)
            .reply((uri) => {
                if (uri === '/v1/checkout/sessions') {
                    return [200, {id: 'cs_123', url: 'https://site.com'}];
                }
                if (uri === '/v1/prices') {
                    return [200, {
                        id: 'price_3',
                        active: true,
                        currency: 'usd',
                        unit_amount: 500,
                        recurring: {
                            interval: 'month'
                        }
                    }];
                }

                return [500];
            });

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
                .reply((uri) => {
                    const [match, resource, id] = uri.match(/\/v1\/(\w+)\/(.+)\/?/) || [null];
                    if (match) {
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
                                unit_amount: 500,
                                recurring: {
                                    interval: 'month'
                                }
                            }];
                        }
                    }

                    return [500];
                });

            const scope = nock('https://api.stripe.com')
                .persist()
                .post(/v1\/.*/)
                .reply((uri, body) => {
                    if (uri === '/v1/checkout/sessions') {
                        const parsed = new URLSearchParams(body);
                        should(parsed.get('metadata[attribution_url]')).eql('/test');
                        should(parsed.get('metadata[attribution_type]')).eql('url');
                        should(parsed.get('metadata[attribution_id]')).be.null();

                        return [200, {id: 'cs_123', url: 'https://site.com'}];
                    }
                    if (uri === '/v1/prices') {
                        return [200, {
                            id: 'price_4',
                            active: true,
                            currency: 'usd',
                            unit_amount: 500,
                            recurring: {
                                interval: 'month'
                            }
                        }];
                    }

                    return [500];
                });

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
                .reply((uri) => {
                    const [match, resource, id] = uri.match(/\/v1\/(\w+)\/(.+)\/?/) || [null];
                    if (match) {
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
                                unit_amount: 50,
                                recurring: {
                                    interval: 'month'
                                }
                            }];
                        }
                    }

                    return [500];
                });

            const scope = nock('https://api.stripe.com')
                .persist()
                .post(/v1\/.*/)
                .reply((uri, body) => {
                    if (uri === '/v1/checkout/sessions') {
                        const parsed = new URLSearchParams(body);
                        should(parsed.get('metadata[attribution_url]')).eql(url);
                        should(parsed.get('metadata[attribution_type]')).eql('post');
                        should(parsed.get('metadata[attribution_id]')).eql(post.id);

                        return [200, {id: 'cs_123', url: 'https://site.com'}];
                    }
                    if (uri === '/v1/prices') {
                        return [200, {
                            id: 'price_5',
                            active: true,
                            currency: 'usd',
                            unit_amount: 500,
                            recurring: {
                                interval: 'month'
                            }
                        }];
                    }

                    return [500];
                });

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
                .reply((uri) => {
                    const [match, resource, id] = uri.match(/\/v1\/(\w+)\/(.+)\/?/) || [null];
                    if (match) {
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
                                unit_amount: 500,
                                recurring: {
                                    interval: 'month'
                                }
                            }];
                        }
                    }

                    return [500];
                });

            const scope = nock('https://api.stripe.com')
                .persist()
                .post(/v1\/.*/)
                .reply((uri, body) => {
                    if (uri === '/v1/checkout/sessions') {
                        const parsed = new URLSearchParams(body);
                        should(parsed.get('metadata[attribution_url]')).be.null();
                        should(parsed.get('metadata[attribution_type]')).be.null();
                        should(parsed.get('metadata[attribution_id]')).be.null();

                        return [200, {id: 'cs_123', url: 'https://site.com'}];
                    }
                    if (uri === '/v1/prices') {
                        return [200, {
                            id: 'price_6',
                            active: true,
                            currency: 'usd',
                            unit_amount: 500,
                            recurring: {
                                interval: 'month'
                            }
                        }];
                    }

                    return [500];
                });

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
});
