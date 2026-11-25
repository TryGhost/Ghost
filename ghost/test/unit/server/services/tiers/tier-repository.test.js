const assert = require('node:assert/strict');
const sinon = require('sinon');
const { Product: ProductModel } = require('../../../../../core/server/models/product');
const TierRepository = require('../../../../../core/server/services/tiers/tier-repository');
const Tier = require('../../../../../core/server/services/tiers/tier');

describe('TierRepository', function () {
  afterAll(function () {
    sinon.restore();
  });

  it('Can do basic functionality', async function () {
    const DomainEvents = {
      dispatch: sinon.stub(),
    };
    sinon.stub(ProductModel, 'findAll').resolves([]);
    sinon.stub(ProductModel, 'findOne').resolves([]);
    sinon.stub(ProductModel, 'edit').resolves();
    sinon.stub(ProductModel, 'add').resolves();

    const repository = new TierRepository({
      DomainEvents,
      ProductModel,
    });

    await repository.init();

    const tier = await Tier.create({
      name: 'Test',
      slug: 'test-tier',
      type: 'paid',
      status: 'active',
      currency: 'USD',
      monthlyPrice: 5,
      yearlyPrice: 50,
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

  it('edits rather than adds a tier saved while it reloads', async function () {
    const tier = await Tier.create({
      name: 'Gold',
      slug: 'gold',
      type: 'paid',
      status: 'active',
      currency: 'USD',
      monthlyPrice: 5,
      yearlyPrice: 50,
    });
    const products = {
      findAll: sinon.stub().resolves([]),
      add: sinon.stub().resolves(),
      edit: sinon.stub().resolves(),
    };
    const repository = new TierRepository({
      DomainEvents: { dispatch: sinon.stub() },
      ProductModel: products,
    });
    await repository.init();
    await repository.save(tier);
    const written = products.add.firstCall.args[0];
    products.findAll.resolves([{ toJSON: () => written }]);
    // Holds the reload once it has read the rows, while it builds the tiers
    const building = Promise.withResolvers();
    const built = Promise.withResolvers();
    const create = Tier.create;
    const held = sinon.stub(Tier, 'create').callsFake(async (data) => {
      if (held.callCount === 1) {
        building.resolve();
        await built.promise;
      }
      return create.call(Tier, data);
    });

    const reloading = repository.init();
    await building.promise;
    await repository.save(tier);
    held.restore();

    sinon.assert.calledOnce(products.add);
    sinon.assert.calledOnce(products.edit);
    built.resolve();
    await reloading;
  });
});
