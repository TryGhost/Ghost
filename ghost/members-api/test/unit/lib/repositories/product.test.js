const assert = require('assert');
const sinon = require('sinon');
const ProductRepository = require('../../../../lib/repositories/product');

// @NOTE: This is a dirty import from the Ghost "core"!
//        extract it to it's own package and import here as require('@tryghost/adapter-base-cache-memory');
const MemoryCache = require('../../../../../core/core/server/adapters/cache/Memory');

describe('MemberRepository', function () {
    describe('list', function () {
        it('call find page on the Product model with same as passed in parameters', async function () {
            const productStub = {
                findPage: sinon.stub().resolves()
            };
            const cache = new MemoryCache();

            const productRepository = new ProductRepository({
                Product: productStub,
                cache: cache
            });

            await productRepository.list({
                withRelated: ['monthlyPrice', 'yearlyPrice'],
                transacting: true
            });

            assert.ok(productStub.findPage.called);
            assert(productStub.findPage.calledWith({
                withRelated: ['monthlyPrice', 'yearlyPrice'],
                transacting: true
            }), 'should pass through all parameters to the model as is');
        });

        it('retrieves records from cache on the seconds call instead of model', async function () {
            const stubResult = [{
                id: 'product_id_1'
            }, {
                id: 'product_id_2'
            }];
            const productStub = {
                findPage: sinon.stub().resolves(stubResult)
            };
            const cache = new MemoryCache();

            const productRepository = new ProductRepository({
                Product: productStub,
                cache: cache
            });

            // first call going to the model
            const firstResult = await productRepository.list({
                withRelated: ['monthlyPrice', 'yearlyPrice'],
                transacting: true
            });

            assert.equal(productStub.findPage.callCount, 1, 'should only call the model once');
            assert.equal(firstResult, stubResult);

            // second call going to the cache
            await productRepository.list({
                withRelated: ['monthlyPrice', 'yearlyPrice'],
                transacting: true
            });

            assert.equal(productStub.findPage.callCount, 1, 'should only call the model once');
            assert.equal(firstResult, stubResult);
        });

        it('retrieves records from the model once the cache clearing method was called', async function () {
            const stubResult = [{
                id: 'product_id_1'
            }, {
                id: 'product_id_2'
            }];
            const stubAddedProduct = {
                id: 'added_product_id_1',
                related: () => {
                    return {
                        fetch: () => {}
                    };
                }
            };
            const productStub = {
                findPage: sinon.stub().resolves(stubResult),
                add: sinon.stub().resolves(stubAddedProduct),
                edit: sinon.stub().resolves(stubAddedProduct)
            };
            const cache = new MemoryCache();

            const productRepository = new ProductRepository({
                Product: productStub,
                StripeProduct: {
                    add: sinon.stub().resolves()
                },
                StripePrice: {
                    add: sinon.stub().resolves({
                        id: 'created_stripe_price_id'
                    })
                },
                cache: cache,
                stripeAPIService: {
                    configured: true,
                    createProduct: sinon.stub().resolves({
                        id: 'created_stripe_product_id'
                    }),
                    createPrice: sinon.stub().resolves({
                        id: 'created_stripe_price_id'
                    })
                }
            });

            assert.equal(productStub.findPage.callCount, 0, 'should have no calls to the model yet');

            // first call going to the model
            await productRepository.list({
                withRelated: ['monthlyPrice', 'yearlyPrice'],
                transacting: true
            });

            assert.equal(productStub.findPage.callCount, 1, 'should call the model for the first time');

            // second call going to the cache
            await productRepository.list({
                withRelated: ['monthlyPrice', 'yearlyPrice'],
                transacting: true
            });

            // creating new record through  the repository to clear the cache
            await productRepository.create({
                stripe_prices: [],
                monthly_price: {
                    amount: 600
                },
                yearly_price: {
                    amount: 6660
                }
            }, {
                transacting: true
            });

            // call after create goes to the model
            await productRepository.list({
                withRelated: ['monthlyPrice', 'yearlyPrice'],
                transacting: true
            });

            assert.equal(productStub.findPage.callCount, 2, 'should call the model for the second time');

            // call goes to the cache
            await productRepository.list({
                withRelated: ['monthlyPrice', 'yearlyPrice'],
                transacting: true
            });

            assert.equal(productStub.findPage.callCount, 2, 'call count to the model stays the same');
        });
    });

    describe('getDefaultProduct', function () {
        it('calls list method with specific parameters', async function () {
            const productRepository = new ProductRepository({});
            const listStub = sinon.stub(productRepository, 'list').resolves({
                data: [{
                    id: 'default_product_id'
                }]
            });

            const defaultProduct = await productRepository.getDefaultProduct({
                withRelated: ['stripePrices']
            });

            assert.ok(listStub.called);

            assert.equal(listStub.args[0][0].filter, 'type:paid+active:true', 'should only take into account paid and active records');
            assert.equal(listStub.args[0][0].limit, 1, 'should only fetch a single record');
            assert.deepEqual(listStub.args[0][0].withRelated, ['stripePrices'], 'should extend passed in options');

            assert.equal(defaultProduct.id, 'default_product_id', 'returns a single product object');
        });
    });
});
