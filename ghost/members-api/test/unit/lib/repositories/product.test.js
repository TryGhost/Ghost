const assert = require('assert/strict');
const sinon = require('sinon');
const ProductRepository = require('../../../../lib/repositories/ProductRepository');

describe('MemberRepository', function () {
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
