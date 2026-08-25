const assert = require('node:assert/strict');
const sinon = require('sinon');

const { Post } = require('../../../../../core/server/models/post');
const { Member } = require('../../../../../core/server/models/member');
const { Product } = require('../../../../../core/server/models/product');
const {
  StripeCustomerSubscription,
} = require('../../../../../core/server/models/stripe-customer-subscription');

const createSerialize = require('../../../../../core/server/services/webhooks/serialize');

const noRelationsUrlService = { getRequiredRelations: () => [] };
const serialize = createSerialize({ urlService: noRelationsUrlService });

// Mocked internals
const tiersService = require('../../../../../core/server/services/tiers');

const { fixtureManager } = require('../../../../utils/e2e-framework');

describe('WebhookService - Serialize', function () {
  beforeEach(function () {
    tiersService.api = {
      browse() {
        return {};
      },
    };
  });

  afterEach(function () {
    tiersService.api = null;
    sinon.restore();
  });

  it('rejects with no arguments', async function () {
    await assert.rejects(
      async () => {
        await serialize();
      },
      (error) => {
        assert.equal(error.name, 'TypeError');
        return true;
      },
    );
  });

  it('rejects with no model', async function () {
    await assert.rejects(
      async () => {
        await serialize('fake.hook');
      },
      (error) => {
        assert.equal(error.name, 'TypeError');
        return true;
      },
    );
  });

  it('can serialize a basic model', async function () {
    const fakeModel = {
      attributes: {},
      _previousAttributes: {},
    };

    const result = await serialize('test.hook', fakeModel);
    assert.deepEqual(result, { test: { current: {}, previous: {} } });
  });

  it('can serialize a new post', async function () {
    const post = fixtureManager.get('posts', 1);
    const postModel = new Post(post);
    sinon.stub(postModel, 'load').resolves(postModel);

    const result = await serialize('post.added', postModel);

    assert.ok(result.post, 'Should be wrapped in post');
    assert.deepEqual(result.post.previous, {});
    // @TODO: use snapshot matching here
    assert.equal(
      result.post.current.reading_time,
      1,
      'The reading time generated field should be present',
    );
  });

  it('loads only the URL service relations the event model is missing', async function () {
    // The URL service declares which relations it reads when routing (e.g.
    // tags for a tags:internal-tag collection). Only the missing ones are
    // loaded: a relation the event already carries (authors, with its
    // nested roles) is left untouched so the payload keeps them.
    const urlService = { getRequiredRelations: () => ['tags', 'authors'] };
    const serializeWithRelations = createSerialize({ urlService });

    const post = fixtureManager.get('posts', 1);
    const postModel = new Post(post);
    postModel.relations = { authors: {} };
    sinon.stub(postModel, 'load').resolves(postModel);

    await serializeWithRelations('post.published', postModel);

    sinon.assert.calledWith(postModel.load, ['tags']);
  });

  it('loads no relations when the URL service needs none', async function () {
    const post = fixtureManager.get('posts', 1);
    const postModel = new Post(post);
    sinon.stub(postModel, 'load').resolves(postModel);

    await serialize('post.published', postModel);

    sinon.assert.neverCalledWith(postModel.load, sinon.match.array);
  });

  it('can serialize an edited post', async function () {
    const post = fixtureManager.get('posts', 1);
    const postModel = new Post(post);
    sinon.stub(postModel, 'load').resolves(postModel);

    // We use both _previousAttributes and _changed in the webhook serializer
    postModel._previousAttributes.title = post.title;
    postModel._changed = { title: post.title };
    postModel.attributes.title = 'A brand new title';

    const result = await serialize('post.edited', postModel);

    assert.ok(result.post, 'Should be wrapped in post');
    // @TODO: use snapshot matching here
    assert.equal(
      result.post.current.title,
      'A brand new title',
      'The updated title should be present',
    );
    assert.equal(
      result.post.previous.title,
      'Ghostly Kitchen Sink',
      'The previous title should also be present',
    );
  });

  it('can serialize reconstructed member.edited model event state', async function () {
    const previousUpdatedAt = new Date('2026-04-28T15:55:45.000Z');
    const currentUpdatedAt = new Date('2026-05-29T00:00:00.000Z');
    const memberModel = new Member({
      id: 'member-id',
      uuid: 'member-uuid',
      email: 'member@example.com',
      status: 'free',
      created_at: previousUpdatedAt,
      updated_at: currentUpdatedAt,
    });

    sinon.stub(memberModel, 'load').resolves(memberModel);
    memberModel._previousAttributes = {
      ...memberModel.attributes,
      status: 'comped',
      updated_at: previousUpdatedAt,
    };
    memberModel._changed = {
      status: 'free',
      updated_at: currentUpdatedAt,
    };

    const result = await serialize('member.edited', memberModel);

    sinon.assert.calledOnceWithExactly(memberModel.load, ['labels', 'products', 'newsletters']);
    assert.equal(result.member.current.status, 'free');
    assert.equal(result.member.current.comped, false);
    assert.deepEqual(result.member.current.updated_at, currentUpdatedAt);
    assert.equal(result.member.previous.status, 'comped');
    assert.deepEqual(result.member.previous.updated_at, previousUpdatedAt);
    assert.deepEqual(Object.keys(result.member.previous).sort(), ['status', 'updated_at']);
  });

  it('includes the previous tiers when a member switches between paid tiers', async function () {
    // bookshelf only populates `_previousAttributes` on fetch, not construction
    const asFetched = (model) => {
      model._previousAttributes = { ...model.attributes };
      return model;
    };
    const oldTier = asFetched(
      new Product({ id: 'tier-old', name: 'Bronze', slug: 'bronze', type: 'paid', active: true }),
    );
    const newTier = asFetched(
      new Product({ id: 'tier-new', name: 'Gold', slug: 'gold', type: 'paid', active: true }),
    );

    const memberModel = new Member({
      id: 'member-id',
      uuid: 'member-uuid',
      email: 'member@example.com',
      status: 'paid',
      created_at: new Date('2026-01-01T00:00:00.000Z'),
      updated_at: new Date('2026-01-01T00:00:00.000Z'),
    });

    // mirrors bookshelf-relations' extendChanged + attachPreviousRelations output
    // for a tier switch that touches no members column
    memberModel._previousAttributes = { ...memberModel.attributes };
    memberModel._changed = {
      products: { attached: [newTier], detached: [oldTier] },
    };
    memberModel._previousRelations = { products: { models: [oldTier] } };
    memberModel.related('products').models = [newTier];

    sinon.stub(memberModel, 'load').resolves(memberModel);

    const result = await serialize('member.edited', memberModel);

    assert.deepEqual(
      result.member.current.tiers.map((tier) => tier.slug),
      ['gold'],
    );
    assert.deepEqual(
      result.member.previous.tiers.map((tier) => tier.slug),
      ['bronze'],
    );
  });

  it('includes the previous subscriptions when a cancellation flips cancel_at_period_end', async function () {
    // bookshelf only populates _previousAttributes on fetch, and `previous: true`
    // cascades into related models — so these have to look fetched, not constructed.
    const asFetched = (model) => {
      model._previousAttributes = { ...model.attributes };
      return model;
    };
    const activeSub = asFetched(
      new StripeCustomerSubscription({
        id: 'sub-1',
        subscription_id: 'sub_123',
        status: 'active',
        cancel_at_period_end: false,
        plan_id: 'price_123',
        plan_nickname: 'Monthly',
        plan_amount: 500,
        plan_interval: 'month',
        plan_currency: 'usd',
      }),
    );
    const cancellingSub = asFetched(
      new StripeCustomerSubscription({
        id: 'sub-1',
        subscription_id: 'sub_123',
        status: 'active',
        cancel_at_period_end: true,
        plan_id: 'price_123',
        plan_nickname: 'Monthly',
        plan_amount: 500,
        plan_interval: 'month',
        plan_currency: 'usd',
      }),
    );

    const memberModel = new Member({
      id: 'member-id',
      uuid: 'member-uuid',
      email: 'member@example.com',
      status: 'paid',
      created_at: new Date('2026-01-01T00:00:00.000Z'),
      updated_at: new Date('2026-01-01T00:00:00.000Z'),
    });

    // Cancelling touches no members column — the subscription relation is the only change
    memberModel._previousAttributes = { ...memberModel.attributes };
    memberModel._changed = { stripeSubscriptions: { cancel_at_period_end: true } };
    memberModel._previousRelations = { stripeSubscriptions: { models: [activeSub] } };
    memberModel.related('stripeSubscriptions').models = [cancellingSub];

    sinon.stub(memberModel, 'load').resolves(memberModel);

    const result = await serialize('member.edited', memberModel);

    assert.equal(result.member.current.subscriptions[0].cancel_at_period_end, true);
    assert.equal(result.member.previous.subscriptions[0].cancel_at_period_end, false);
  });
});
