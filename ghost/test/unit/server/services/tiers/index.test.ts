import assert from 'node:assert/strict';
import { setImmediate } from 'node:timers/promises';
import sinon from 'sinon';
import { openServices } from '../../../../utils/services';

const DomainEvents = require('@tryghost/domain-events');
const { IncorrectUsageError } = require('@tryghost/errors');
const models = require('../../../../../core/server/models');
const TierRepository = require('../../../../../core/server/services/tiers/tier-repository');
const TiersAPI = require('../../../../../core/server/services/tiers/tiers-api');
const TierCreatedEvent = require('../../../../../core/server/services/tiers/tier-created-event');

const rootPath = require.resolve('../../../../../core/server/services/tiers');
const tiersApiPath = require.resolve('../../../../../core/server/services/tiers/tiers-api');
const metafieldsPath = require.resolve('../../../../../core/server/services/members-metafields');
// The real check, which refuses until boot has set the custom fields services up. No unit test
// sets them up.
const { booted: bootedBeforeSetUp } = require(metafieldsPath);

const FREE_ID = '0000000000000000000000a1';
const PAID_ID = '0000000000000000000000a2';

function productRow(json: Record<string, unknown>) {
  return {
    toJSON: () => ({
      welcome_page_url: null,
      visibility: 'public',
      trial_days: 0,
      description: null,
      created_at: new Date('2030-01-01T00:00:00Z'),
      updated_at: null,
      benefits: [],
      ...json,
    }),
  };
}

const freeRow = productRow({
  id: FREE_ID,
  name: 'Free',
  slug: 'free',
  active: true,
  type: 'free',
  currency: null,
  monthly_price: null,
  yearly_price: null,
});

const paidRow = productRow({
  id: PAID_ID,
  name: 'Gold',
  slug: 'gold',
  active: true,
  type: 'paid',
  currency: 'usd',
  monthly_price: 500,
  yearly_price: 5000,
  benefits: [{ name: 'Extra posts' }],
});

function fakeProductModel() {
  // A function, like the Bookshelf model it replaces.
  return Object.assign(function Product() {}, {
    findAll: sinon.stub().resolves([freeRow, paidRow]),
    generateSlug: sinon.stub().resolves('generated-slug'),
    add: sinon.stub().resolves(),
    edit: sinon.stub().resolves(),
  });
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe('Tiers root', function () {
  const sandbox = sinon.createSandbox();
  const cached = new Map<string, NodeJS.Module | undefined>();
  let Product: ReturnType<typeof fakeProductModel>;
  let dispatch: sinon.SinonStub;
  let metafields: { booted: () => unknown };

  /** A fresh root, so each case loads the root against its own doubles. */
  function loadRoot() {
    delete require.cache[rootPath];
    return require(rootPath).default;
  }

  beforeEach(function () {
    cached.set(rootPath, require.cache[rootPath]);
    Product = fakeProductModel();
    sandbox.replace(models, 'Product', Product);
    dispatch = sandbox.stub(DomainEvents, 'dispatch');
    // Boot sets up the custom fields services before tiers.
    metafields = { booted: () => ({ bindings: {} }) };
    require(metafieldsPath);
    const metafieldsModule = require.cache[metafieldsPath];
    assert.ok(metafieldsModule);
    sandbox.replace(metafieldsModule, 'exports', metafields);
  });

  afterEach(function () {
    sandbox.restore();
    for (const [path, module] of cached) {
      delete require.cache[path];
      if (module) {
        require.cache[path] = module;
      }
    }
    cached.clear();
  });

  it('fails its first use before the custom fields services are set up, and builds once they are', function () {
    const booted = metafields.booted;
    metafields.booted = bootedBeforeSetUp;
    const root = loadRoot();
    openServices();

    assert.throws(() => root.service, IncorrectUsageError);
    sinon.assert.notCalled(Product.findAll);

    metafields.booted = booted;
    assert.ok(root.service.api instanceof TiersAPI);
  });

  it('publishes a repository that reads nothing until a tier is first read', async function () {
    const root = loadRoot();

    openServices();

    assert.ok(root.service.repository instanceof TierRepository);
    assert.ok(root.service.api instanceof TiersAPI);
    sinon.assert.notCalled(Product.findAll);

    const page = await root.service.api.browse();
    sinon.assert.calledOnceWithExactly(Product.findAll, { withRelated: ['benefits'] });
    assert.deepEqual(
      page.data.map((tier: { name: string; benefits: string[] }) => [tier.name, tier.benefits]),
      [
        ['Free', []],
        ['Gold', ['Extra posts']],
      ],
    );

    // Later reads are served from what the first one loaded.
    await root.service.api.browse();
    await root.service.api.read(PAID_ID);
    sinon.assert.calledOnce(Product.findAll);

    // The API reads through the published repository, not a separate instance.
    const sentinel = { id: 'sentinel' };
    const getById = sandbox.stub(root.service.repository, 'getById').resolves(sentinel);
    assert.equal(await root.service.api.read(PAID_ID), sentinel);
    sinon.assert.calledOnce(getById);
    assert.equal(getById.firstCall.args[0].toHexString(), PAID_ID);
  });

  it('shares one load between reads that overlap before the tiers have loaded', async function () {
    const loading = deferred<unknown[]>();
    Product.findAll.returns(loading.promise);
    const root = loadRoot();
    openServices();

    const first = root.service.api.browse();
    const second = root.service.api.read(PAID_ID);
    // Drain runnable promise continuations while the load stays unresolved.
    await setImmediate();

    sinon.assert.calledOnce(Product.findAll);

    loading.resolve([paidRow]);
    const [page, tier] = await Promise.all([first, second]);

    assert.deepEqual(
      page.data.map((item: { name: string }) => item.name),
      ['Gold'],
    );
    assert.equal(tier.name, 'Gold');
    sinon.assert.calledOnce(Product.findAll);
  });

  it('fails the read whose load rejects, and loads again on the next read', async function () {
    const failure = new Error('Products unavailable');
    Product.findAll.onFirstCall().rejects(failure);
    const root = loadRoot();
    openServices();

    await assert.rejects(root.service.api.browse(), (error) => error === failure);

    const page = await root.service.api.browse();

    sinon.assert.calledTwice(Product.findAll);
    assert.equal(page.data.length, 2);
  });

  it('reads the tiers again after the repository is told to reload', async function () {
    const root = loadRoot();
    openServices();
    await root.service.api.browse();
    Product.findAll.resolves([paidRow]);

    root.service.repository.reload();
    // Reloading reads nothing by itself.
    sinon.assert.calledOnce(Product.findAll);

    const page = await root.service.api.browse();
    sinon.assert.calledTwice(Product.findAll);
    assert.deepEqual(
      page.data.map((item: { name: string }) => item.name),
      ['Gold'],
    );
  });

  it('loads through the transaction of a first read made inside one, and keeps nothing from it', async function () {
    const root = loadRoot();
    openServices();
    const transacting = { id: 'transaction' };

    const tier = await root.service.api.read(PAID_ID, { transacting });

    assert.equal(tier.name, 'Gold');
    sinon.assert.calledOnceWithExactly(Product.findAll, {
      withRelated: ['benefits'],
      transacting,
    });

    // What a transaction saw may be rolled back, so the next read loads for itself and is kept.
    await root.service.api.browse();
    sinon.assert.calledTwice(Product.findAll);
    assert.deepEqual(Product.findAll.secondCall.args, [{ withRelated: ['benefits'] }]);

    // Once loaded, a read inside a transaction is served from memory.
    await root.service.api.read(PAID_ID, { transacting });
    sinon.assert.calledTwice(Product.findAll);
  });

  it('fails the first use when the API cannot be constructed, and builds one on the next use', function () {
    const failure = new Error('API unavailable');
    const tiersApiModule = require.cache[tiersApiPath];
    assert.ok(tiersApiModule);
    const RealTiersAPI = tiersApiModule.exports;
    const construct = sandbox.stub().onFirstCall().throws(failure);
    sandbox.replace(
      tiersApiModule,
      'exports',
      class extends RealTiersAPI {
        constructor(deps: unknown) {
          construct(deps);
          super(deps);
        }
      },
    );
    const root = loadRoot();
    openServices();

    assert.throws(
      () => root.service,
      (error) => error === failure,
    );

    assert.ok(root.service.api instanceof RealTiersAPI);
    sinon.assert.calledTwice(construct);
    assert.equal(construct.secondCall.args[0].repository, root.service.repository);
  });

  it('generates slugs through the current Product model and saves through the one it was built with', async function () {
    const root = loadRoot();
    openServices();
    const tierData = {
      name: 'Silver',
      visibility: 'public',
      currency: 'usd',
      monthlyPrice: 300,
      yearlyPrice: 3000,
    };

    const tier = await root.service.api.add(tierData);

    sinon.assert.calledOnceWithExactly(Product.generateSlug, Product, 'Silver', {});
    assert.equal(tier.slug, 'generated-slug');
    sinon.assert.calledOnce(Product.add);
    assert.equal(Product.add.firstCall.args[0].slug, 'generated-slug');
    sinon.assert.calledOnce(dispatch);
    assert.ok(dispatch.firstCall.args[0] instanceof TierCreatedEvent);
    assert.equal(dispatch.firstCall.args[0].data.tier.id.toHexString(), tier.id.toHexString());

    // Slugs look the model up on each call; the repository keeps the model it was built with.
    const replacement = fakeProductModel();
    replacement.generateSlug.resolves('replacement-slug');
    // Restored with the sandbox's replacement in afterEach.
    models.Product = replacement;

    const second = await root.service.api.add({ ...tierData, slug: 'requested' });

    sinon.assert.calledOnceWithExactly(replacement.generateSlug, replacement, 'requested', {});
    assert.equal(second.slug, 'replacement-slug');
    sinon.assert.calledTwice(Product.add);
    sinon.assert.notCalled(replacement.add);
  });

  it('needs the API as the receiver of its operations', async function () {
    const root = loadRoot();
    openServices();
    const { browse, read } = root.service.api;

    await assert.rejects(browse(), TypeError);
    await assert.rejects(read(PAID_ID), TypeError);
  });
});
