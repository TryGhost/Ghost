const assert = require('node:assert/strict');
const sinon = require('sinon');
const knex = require('knex').default;

const Tier = require('../../../../../../../core/server/services/tiers/tier');

const PaymentsService = require('../../../../../../../core/server/services/members/members-api/services/payments-service');

describe('PaymentsService', function () {
    let Bookshelf;
    let db;

    before(async function () {
        db = knex({
            client: 'sqlite3',
            useNullAsDefault: true,
            connection: {
                filename: ':memory:'
            }
        });
        await db.schema.createTable('offers', function (table) {
            table.string('id', 24);
            table.string('stripe_coupon_id', 255);
            table.string('discount_type', 191);
        });
        await db.schema.createTable('stripe_products', function (table) {
            table.string('id', 24);
            table.string('product_id', 24);
            table.string('stripe_product_id', 255);
        });
        await db.schema.createTable('stripe_prices', function (table) {
            table.string('id', 24);
            table.string('stripe_price_id', 255);
            table.string('stripe_product_id', 255);
            table.boolean('active');
            table.string('nickname', 191);
            table.string('currency', 50);
            table.integer('amount');
            table.string('type', 50);
            table.string('interval', 50);
        });
        await db.schema.createTable('stripe_customers', function (table) {
            table.string('id', 24);
            table.string('member_id', 24);
            table.string('stripe_customer_id', 255);
            table.string('name', 191);
            table.string('email', 191);
        });

        Bookshelf = require('bookshelf')(db);
    });

    beforeEach(async function () {
        await db('offers').truncate();
        await db('stripe_products').truncate();
        await db('stripe_prices').truncate();
        await db('stripe_customers').truncate();
    });

    after(async function () {
        await db.destroy();
    });

    describe('getPaymentLink', function () {
        it('Can handle 404 from Stripe', async function () {
            const BaseModel = Bookshelf.Model.extend({}, {
                async add() {},
                async edit() {}
            });
            const Offer = BaseModel.extend({
                tableName: 'offers'
            });
            const StripeProduct = BaseModel.extend({
                tableName: 'stripe_products'
            });
            const StripePrice = BaseModel.extend({
                tableName: 'stripe_prices'
            });
            const StripeCustomer = BaseModel.extend({
                tableName: 'stripe_customers'
            });

            const offersAPI = {};
            const stripeAPIService = {
                createCheckoutSession: sinon.fake.resolves({
                    url: 'https://checkout.session'
                }),
                getCustomer: sinon.fake(),
                createCustomer: sinon.fake(),
                getProduct: sinon.fake.resolves({
                    id: 'prod_1',
                    active: true
                }),
                editProduct: sinon.fake(),
                createProduct: sinon.fake.resolves({
                    id: 'prod_1',
                    active: true
                }),
                getPrice: sinon.fake.rejects(new Error('Price does not exist')),
                createPrice: sinon.fake(function (data) {
                    return Promise.resolve({
                        id: 'price_1',
                        active: data.active,
                        unit_amount: data.amount,
                        currency: data.currency,
                        nickname: data.nickname,
                        recurring: {
                            interval: data.interval
                        }
                    });
                }),
                createCoupon: sinon.fake()
            };
            const service = new PaymentsService({
                Offer,
                StripeProduct,
                StripePrice,
                StripeCustomer,
                offersAPI,
                stripeAPIService
            });

            const tier = await Tier.create({
                name: 'Test tier',
                slug: 'test-tier',
                currency: 'usd',
                monthlyPrice: 1000,
                yearlyPrice: 10000
            });

            const price = StripePrice.forge({
                id: 'id_1',
                stripe_price_id: 'price_1',
                stripe_product_id: 'prod_1',
                active: true,
                interval: 'month',
                nickname: 'Monthly',
                currency: 'usd',
                amount: 1000,
                type: 'recurring'
            });

            const product = StripeProduct.forge({
                id: 'id_1',
                stripe_product_id: 'prod_1',
                product_id: tier.id.toHexString()
            });

            await price.save(null, {method: 'insert'});
            await product.save(null, {method: 'insert'});

            const cadence = 'month';
            const offer = null;
            const member = null;
            const metadata = {};
            const options = {};

            const url = await service.getPaymentLink({
                tier,
                cadence,
                offer,
                member,
                metadata,
                options
            });

            assert(url);
        });

        it('Can remove trial days in case of an existing coupon', async function () {
            const BaseModel = Bookshelf.Model.extend({}, {
                async add() {},
                async edit() {}
            });
            const Offer = BaseModel.extend({
                tableName: 'offers',
                where: () => {
                    return {
                        query: () => {
                            return {
                                select: () => {
                                    return {
                                        first: sinon.stub().resolves({
                                            stripe_coupon_id: 'stripe_coupon_1'
                                        })
                                    };
                                }
                            };
                        }
                    };
                }
            });
            const StripeProduct = BaseModel.extend({
                tableName: 'stripe_products'
            });
            const StripePrice = BaseModel.extend({
                tableName: 'stripe_prices'
            });
            const StripeCustomer = BaseModel.extend({
                tableName: 'stripe_customers'
            });

            const offersAPI = {};

            const stripeAPIService = {
                createCheckoutSession: sinon.fake.resolves({
                    url: 'https://checkout.session'
                }),
                getCustomer: sinon.fake(),
                createCustomer: sinon.fake(),
                getProduct: sinon.fake.resolves({
                    id: 'prod_1',
                    active: true
                }),
                editProduct: sinon.fake(),
                createProduct: sinon.fake.resolves({
                    id: 'prod_1',
                    active: true
                }),
                getPrice: sinon.fake(function () {
                    return Promise.resolve({
                        id: 'price_1'
                    });
                }),
                createPrice: sinon.fake(function (data) {
                    return Promise.resolve({
                        id: 'price_1',
                        active: data.active,
                        unit_amount: data.amount,
                        currency: data.currency,
                        nickname: data.nickname,
                        recurring: {
                            interval: data.interval
                        }
                    });
                }),
                createCoupon: sinon.fake()
            };
            const service = new PaymentsService({
                Offer,
                StripeProduct,
                StripePrice,
                StripeCustomer,
                offersAPI,
                stripeAPIService
            });

            const tier = await Tier.create({
                name: 'Test tier',
                slug: 'test-tier',
                currency: 'usd',
                monthlyPrice: 1000,
                yearlyPrice: 10000,
                trialDays: 7
            });

            const price = StripePrice.forge({
                id: 'id_1',
                stripe_price_id: 'price_1',
                stripe_product_id: 'prod_1',
                active: true,
                interval: 'month',
                nickname: 'Monthly',
                currency: 'usd',
                amount: 1000,
                type: 'recurring'
            });

            const product = StripeProduct.forge({
                id: 'id_1',
                stripe_product_id: 'prod_1',
                product_id: tier.id.toHexString()
            });

            await price.save(null, {method: 'insert'});
            await product.save(null, {method: 'insert'});

            const cadence = 'month';
            const offer = {
                id: 'discount_offer_1',
                tier: {
                    id: tier.id.toHexString()
                }
            };
            const member = null;
            const metadata = {};
            const options = {};

            await service.getPaymentLink({
                tier,
                cadence,
                offer,
                member,
                metadata,
                options
            });

            // assert trialDays should not be set when coupon is present for checkout session
            assert.equal(stripeAPIService.createCheckoutSession.getCall(0).args[2].coupon, 'stripe_coupon_1');
            assert.equal(stripeAPIService.createCheckoutSession.getCall(0).args[2].trialDays, undefined);
        });
    });

    describe('getGiftPaymentLink', function () {
        let createGiftCheckoutSessionStub;
        let service;

        beforeEach(function () {
            createGiftCheckoutSessionStub = sinon.fake.resolves({
                url: 'https://checkout.stripe.com/gift-session'
            });
            service = new PaymentsService({
                stripeAPIService: {createGiftCheckoutSession: createGiftCheckoutSessionStub}
            });
        });

        async function createTier(overrides = {}) {
            return Tier.create({
                name: 'Pro',
                slug: 'pro',
                currency: 'usd',
                monthlyPrice: 1000,
                yearlyPrice: 10000,
                ...overrides
            });
        }

        const defaultGiftOptions = {
            successUrl: 'https://example.com/',
            cancelUrl: 'https://example.com/',
            duration: 1,
            metadata: {}
        };

        function getStripeArgs() {
            return createGiftCheckoutSessionStub.firstCall.firstArg;
        }

        it('generates a token and passes correct metadata to Stripe', async function () {
            const tier = await createTier();

            const url = await service.getGiftPaymentLink({
                ...defaultGiftOptions,
                tier,
                cadence: 'month',
                metadata: {requestSrc: 'portal'}
            });

            assert.equal(url, 'https://checkout.stripe.com/gift-session');

            sinon.assert.calledOnce(createGiftCheckoutSessionStub);

            const args = getStripeArgs();
            assert.equal(args.amount, 1000);
            assert.equal(args.currency, 'usd');
            assert.equal(args.tierName, 'Pro');
            assert.equal(args.cadence, 'month');
            assert.equal(args.metadata.ghost_gift, 'true');
            assert.equal(args.metadata.tier_id, tier.id.toHexString());
            assert.equal(args.metadata.cadence, 'month');
            assert.equal(args.metadata.duration, '1');
            assert.equal(args.metadata.buyer_email, undefined, 'buyer_email should not be in metadata');
            assert.equal(args.metadata.requestSrc, 'portal');
            assert.match(args.metadata.gift_token, /^[A-Za-z0-9_-]{8}$/);
        });

        it('appends gift token to success URL', async function () {
            const tier = await createTier({monthlyPrice: 5000, yearlyPrice: 50000});

            await service.getGiftPaymentLink({...defaultGiftOptions, tier, cadence: 'year'});

            const args = getStripeArgs();
            const successUrl = new URL(args.successUrl);

            assert.equal(successUrl.searchParams.get('stripe'), 'gift-purchase-success');
            assert.equal(successUrl.searchParams.get('gift_token'), args.metadata.gift_token);
        });

        it('prevents caller metadata from overwriting gift-specific keys', async function () {
            const tier = await createTier();

            await service.getGiftPaymentLink({
                ...defaultGiftOptions,
                tier,
                cadence: 'month',
                metadata: {ghost_gift: 'false', gift_token: 'malicious-token'}
            });

            const args = getStripeArgs();

            assert.equal(args.metadata.ghost_gift, 'true');
            assert.notEqual(args.metadata.gift_token, 'malicious-token');
        });

        it('looks up Stripe customer for authenticated members', async function () {
            const mockCustomer = {id: 'cus_123', email: 'member@example.com'};
            sinon.stub(service, 'getCustomerForMember').resolves(mockCustomer);

            const tier = await createTier();
            const mockMember = {id: 'member_123', get: sinon.stub().returns('member@example.com')};

            await service.getGiftPaymentLink({
                ...defaultGiftOptions,
                tier,
                cadence: 'month',
                member: mockMember,
                isAuthenticated: true
            });

            sinon.assert.calledOnce(service.getCustomerForMember);
            sinon.assert.calledWith(service.getCustomerForMember, mockMember);
            assert.equal(getStripeArgs().customer, mockCustomer);
        });
    });
});
