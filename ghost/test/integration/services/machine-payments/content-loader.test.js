const assert = require('node:assert/strict');
const testUtils = require('../../../utils');
const models = require('../../../../core/server/models');
const {
  ContentLoader,
} = require('../../../../core/server/services/machine-payments/content-loader');
const {
  MachinePaymentEventRepository,
} = require('../../../../core/server/services/machine-payments/events/machine-payment-event-repository');
const { Pricing } = require('../../../../core/server/services/machine-payments/pricing');

describe('Integration: machine-payments', function () {
  beforeAll(testUtils.teardownDb);
  beforeEach(testUtils.setup('default'));
  afterEach(testUtils.teardownDb);

  it('loads full paid entries and rejects members-only entries', async function () {
    const paid = await models.Post.add(
      testUtils.DataGenerator.forKnex.createPost({
        slug: 'mp-content-loader-paid',
        visibility: 'paid',
        status: 'published',
        lexical: testUtils.DataGenerator.markdownToLexical('Unlocked body'),
      }),
      { context: { internal: true } },
    );

    const membersOnly = await models.Post.add(
      testUtils.DataGenerator.forKnex.createPost({
        slug: 'mp-content-loader-members',
        visibility: 'members',
        status: 'published',
        lexical: testUtils.DataGenerator.markdownToLexical('Members body'),
      }),
      { context: { internal: true } },
    );

    const loader = new ContentLoader({
      urlServiceFacade: {
        getUrlForResource: (entry) => `http://example.com/${entry.slug}/`,
      },
    });

    const loaded = await loader.loadFullEntry('posts', paid.id);
    assert.equal(loaded.id, paid.id);
    assert.equal(loaded.visibility, 'paid');
    assert.equal(loaded.type, 'post');
    assert.equal(loaded.url, 'http://example.com/mp-content-loader-paid/');
    assert.match(loaded.html || '', /Unlocked body/);

    assert.equal(await loader.loadFullEntry('posts', membersOnly.id), null);
    assert.equal(await loader.loadFullEntry('posts', 'missing'), null);
  });

  it('persists payment events idempotently by protocol+reference', async function () {
    const paid = await models.Post.add(
      testUtils.DataGenerator.forKnex.createPost({
        slug: 'mp-event-paid',
        visibility: 'paid',
        status: 'published',
        lexical: testUtils.DataGenerator.markdownToLexical('Event body'),
      }),
      { context: { internal: true } },
    );

    const repository = new MachinePaymentEventRepository({
      MachinePaymentEventModel: models.MachinePaymentEvent,
    });

    const payload = {
      postId: paid.id,
      amount: 100,
      currency: 'USD',
      protocol: 'mpp',
      method: 'tempo',
      reference: `ref-${paid.id}`,
      stripePaymentIntentId: null,
    };

    const first = await repository.save(payload);
    const second = await repository.save(payload);

    assert.equal(first.created, true);
    assert.equal(second.created, false);
    assert.equal(first.event.id, second.event.id);
    assert.equal(first.event.get('reference'), `ref-${paid.id}`);

    const x402 = await repository.save({
      ...payload,
      protocol: 'x402',
      method: 'base',
    });
    assert.equal(x402.created, true);
    assert.notEqual(x402.event.id, first.event.id);
    assert.equal(x402.event.get('protocol'), 'x402');
    assert.equal(x402.event.get('reference'), `ref-${paid.id}`);
  });

  it('returns configured pricing terms and rejects invalid amounts', async function () {
    const settings = {
      get(key) {
        if (key === 'machine_payments_amount') {
          return 250;
        }
        if (key === 'machine_payments_currency') {
          return 'usd';
        }
        return null;
      },
    };
    const pricing = new Pricing({ settingsCache: settings });
    assert.deepEqual(await pricing.getTerms(), { amount: 250, currency: 'USD' });

    assert.throws(() => pricing.assertValidAmount(0), /greater than 0/);
  });
});
