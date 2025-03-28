const assert = require('assert/strict');
const sinon = require('sinon');
const knex = require('knex');
const {Tier} = require('@tryghost/tiers');
const PaymentsService = require('../../lib/PaymentsService');

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
});
