const assert = require('node:assert/strict');
const sinon = require('sinon');
const { Product: ProductModel } = require('../../../../../core/server/models/product');
const TierRepository = require('../../../../../core/server/services/tiers/tier-repository');
const Tier = require('../../../../../core/server/services/tiers/tier');
const {
  InvalidationsService,
} = require('../../../../../core/server/services/invalidations/invalidations-service');
const { LocalTransport } = require('../../../../../core/server/services/invalidations/transport');
const { FakeTransport } = require('../invalidations/fake-transport');
const { FakeProductModel } = require('../../../../utils/fake-product-model');
const { createLoggingFake } = require('../../../../utils/logging-utils');

/** A single instance's registry: it has no peers. */
function localInvalidations() {
  return new InvalidationsService({
    transport: new LocalTransport(),
    instanceId: 'local',
    logging: createLoggingFake(),
  });
}

function goldTier() {
  return Tier.create({
    name: 'Gold',
    slug: 'gold',
    type: 'paid',
    status: 'active',
    currency: 'USD',
    monthlyPrice: 5,
    yearlyPrice: 50,
  });
}

function silverTier() {
  return Tier.create({
    name: 'Silver',
    slug: 'silver',
    type: 'paid',
    status: 'active',
    currency: 'USD',
    monthlyPrice: 3,
    yearlyPrice: 30,
  });
}

function flush() {
  return new Promise((resolve) => {
    setImmediate(resolve);
  });
}

async function eventually(condition, message) {
  for (let i = 0; i < 100 && !(await condition()); i++) {
    await flush();
  }
  assert.ok(await condition(), message);
}

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
      invalidations: localInvalidations(),
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
    const tier = await goldTier();
    const products = {
      findAll: sinon.stub().resolves([]),
      add: sinon.stub().resolves(),
      edit: sinon.stub().resolves(),
    };
    const repository = new TierRepository({
      DomainEvents: { dispatch: sinon.stub() },
      ProductModel: products,
      invalidations: localInvalidations(),
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

  describe('with peers', function () {
    let database;
    let transport;
    let dispatch;
    let repository;

    beforeEach(async function () {
      database = new FakeProductModel();
      transport = new FakeTransport();
      const invalidations = new InvalidationsService({
        transport,
        instanceId: 'this',
        logging: createLoggingFake(),
      });
      await invalidations.start();
      dispatch = sinon.stub();
      repository = new TierRepository({
        DomainEvents: { dispatch },
        ProductModel: database,
        invalidations,
      });
      await repository.init();
    });

    /** Saves through another instance's repository, which shares the database. */
    async function saveOnPeer(tier) {
      const peer = new TierRepository({
        DomainEvents: { dispatch: sinon.stub() },
        ProductModel: database,
        invalidations: localInvalidations(),
      });
      await peer.init();
      await peer.save(tier);
    }

    function peerChangedTiers() {
      return transport.subscribed.onMessage({ name: 'tiers', origin: 'peer' });
    }

    it('tells peers that tiers changed when it saves one', async function () {
      await repository.save(await goldTier());

      await eventually(() => transport.publish.called, 'Peers were not told');
      sinon.assert.calledOnceWithMatch(transport.publish, { name: 'tiers', origin: 'this' });
    });

    it('reloads every tier from the database when a peer changed tiers', async function () {
      const tier = await goldTier();
      await saveOnPeer(tier);
      assert.equal(await repository.getById(tier.id), null);

      await peerChangedTiers();

      const reloaded = await repository.getById(tier.id);
      assert.equal(reloaded?.name, 'Gold');
    });

    it('dispatches no events when a peer changed tiers, as the peer already did', async function () {
      await saveOnPeer(await goldTier());

      await peerChangedTiers();

      sinon.assert.notCalled(dispatch);
    });

    it('keeps a tier it saved while a reload was reading the database', async function () {
      const tier = await goldTier();
      const release = database.holdNext('read');
      const reloading = peerChangedTiers();

      await repository.save(tier);
      release();
      await reloading;

      await eventually(
        async () => (await repository.getById(tier.id)) !== null,
        'The reload dropped the saved tier',
      );
    });

    it('keeps a tier whose write a reload read the database before', async function () {
      const tier = await goldTier();
      const releaseFirstRead = database.holdNext('read');
      const reloading = peerChangedTiers();
      const releaseWrite = database.holdNext('write');
      const saving = repository.save(tier);
      // Any rerun the save asks for reads the table before the write lands
      const releaseSecondRead = database.holdNext('read');
      releaseFirstRead();
      await reloading;
      await flush();

      releaseWrite();
      releaseSecondRead();
      await saving;

      await eventually(
        async () => (await repository.getById(tier.id)) !== null,
        'A reload that read the database before the write dropped the saved tier',
      );
    });

    it('caches a saved tier without reading the database when no reload overlaps the save', async function () {
      const tier = await goldTier();
      const findAll = sinon.spy(database, 'findAll');

      await repository.save(tier);
      await flush();

      sinon.assert.notCalled(findAll);
      assert.equal((await repository.getById(tier.id))?.name, 'Gold');
    });

    it('caches what the database holds when a peer saved the tier between its write and the reply', async function () {
      const tier = await goldTier();
      await repository.save(tier);
      tier.name = 'Gold from this instance';
      const releaseReply = database.holdNext('reply');
      const saving = repository.save(tier);
      await flush();

      await saveOnPeer(await Tier.create({ ...tier.toJSON(), name: 'Gold from a peer' }));
      await peerChangedTiers();
      releaseReply();
      await saving;

      await eventually(
        async () => (await repository.getById(tier.id))?.name === 'Gold from a peer',
        'A save that returned after a reload kept its own older write',
      );
    });

    it('rejects a save, still dispatching its events, when reading back after an overlapping reload fails', async function () {
      const releaseReply = database.holdNext('reply');
      const saving = repository.save(await goldTier());
      await flush();
      await peerChangedTiers();
      const findAll = sinon.stub(database, 'findAll').rejects(new Error('database unavailable'));

      releaseReply();

      await assert.rejects(saving, /saved/);
      sinon.assert.called(dispatch);
      findAll.restore();
    });

    it('keeps a saved tier while a reload that read before the write finishes and its rerun reads', async function () {
      const tier = await goldTier();
      const releaseFirstRead = database.holdNext('read');
      const reloading = peerChangedTiers();
      await repository.save(tier);
      const releaseRerun = database.holdNext('read');

      releaseFirstRead();
      await reloading;

      assert.equal((await repository.getById(tier.id))?.name, 'Gold');
      releaseRerun();
      await flush();
      assert.equal((await repository.getById(tier.id))?.name, 'Gold');
    });

    async function cachedNames() {
      return (await repository.getAll()).map((tier) => tier.name).toSorted();
    }

    it('keeps every tier when a reload reorders them while one is edited', async function () {
      // Cached in the order saved, while the database orders them by price
      const silver = await silverTier();
      await repository.save(await goldTier());
      await repository.save(silver);
      const releaseWrite = database.holdNext('write');
      const saving = repository.save(silver);

      await peerChangedTiers();
      releaseWrite();
      await saving;

      await eventually(
        async () => (await cachedNames()).join() === 'Gold,Silver',
        `A reload during an edit left ${await cachedNames()}`,
      );
    });

    it('caches a new tier once when a reload read it before the add returned', async function () {
      const releaseReply = database.holdNext('reply');
      const saving = repository.save(await goldTier());
      await flush();

      await peerChangedTiers();
      releaseReply();
      await saving;

      await eventually(
        async () => (await cachedNames()).join() === 'Gold',
        `A reload during an add left ${await cachedNames()}`,
      );
    });
  });
});
