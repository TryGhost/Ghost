const assert = require('node:assert/strict');
const sinon = require('sinon');
const {Product: ProductModel} = require('../../../../../core/server/models/product');
const TierRepository = require('../../../../../core/server/services/tiers/tier-repository');
const Tier = require('../../../../../core/server/services/tiers/tier');

describe('TierRepository', function () {
    after(function () {
        sinon.restore();
    });

    it('Can do basic functionality', async function () {
        const DomainEvents = {
            dispatch: sinon.stub()
        };
        sinon.stub(ProductModel, 'findAll').resolves([]);
        sinon.stub(ProductModel, 'findOne').resolves([]);
        sinon.stub(ProductModel, 'edit').resolves();
        sinon.stub(ProductModel, 'add').resolves();

        const repository = new TierRepository({
            DomainEvents,
            ProductModel
        });

        await repository.init();

        const tier = await Tier.create({
            name: 'Test',
            slug: 'test-tier',
            type: 'paid',
            status: 'active',
            currency: 'USD',
            monthlyPrice: 5,
            yearlyPrice: 50
        });

        await repository.save(tier);

        sinon.assert.calledOnce(ProductModel.add);

        const result = await repository.getById(tier.id);

        sinon.assert.notCalled(ProductModel.findOne);

        assert(result);

        result.name = 'New Name';

        await repository.save(tier);

        sinon.assert.calledOnce(ProductModel.edit);
    });
});
