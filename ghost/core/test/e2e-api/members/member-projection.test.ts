import assert from 'node:assert/strict';

const sinon = require('sinon');
const {
  agentProvider,
  fixtureManager,
  matchers,
  mockManager,
} = require('../../utils/e2e-framework');
const { anyEtag, anyISODateTime, anyObjectId, anyString, anyUuid, nullable, stringMatching } =
  matchers;

// `anyISODateTime` pins milliseconds to `.000`. A synthesized subscription's start
// date is `moment()` at request time, so it carries real ones.
const anyISODateTimeWithMillis = stringMatching(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/);
const models = require('../../../core/server/models');
const settingsHelpers = require('../../../core/server/services/settings-helpers');

const COMPED_EMAIL = 'comped-projection@example.com';
const FREE_EMAIL = 'free-projection@example.com';
const WRITABLE_EMAIL = 'writable-projection@example.com';

/**
 * The members API's projection of a member: what Ghost hands a member about
 * themselves, over their own session.
 *
 * One member payload is assembled and several surfaces narrow it independently on
 * the way out, with no shared definition. These snapshots pin this surface's whole
 * body — every key, for each member status that assembles differently — so that
 * moving the assembly and the projection behind it cannot change what a member
 * receives without a snapshot saying so.
 *
 * Whole-body snapshots on purpose. Asserting selected keys would catch a key that
 * changed value and miss one that appeared or vanished, which is the failure these
 * exist to catch.
 */
describe('Members API member projection', function () {
  let membersAgent: {
    get: (_url: string) => any;
    put: (_url: string) => any;
    loginAs: (_email: string) => Promise<any>;
  };

  const memberMatcher = (newslettersCount: number) => ({
    uuid: anyUuid,
    created_at: anyISODateTime,
    newsletters: new Array(newslettersCount).fill({
      id: anyObjectId,
      uuid: anyUuid,
    }),
  });

  // A Stripe-backed subscription: the fixtures mint ids and dates per run, and the
  // tier carries its own. Every key is still named, so one appearing or vanishing
  // fails the snapshot.
  const subscriptionMatcher = {
    id: anyString,
    tier: {
      id: anyObjectId,
      created_at: anyISODateTime,
      updated_at: nullable(anyISODateTime),
      monthly_price_id: anyObjectId,
      yearly_price_id: anyObjectId,
    },
    customer: { id: anyString },
    plan: { id: anyString },
    price: {
      id: anyString,
      price_id: anyString,
      product: { id: anyString, product_id: anyObjectId },
    },
    start_date: anyISODateTime,
    current_period_end: anyISODateTime,
  };

  // A comped member has no Stripe subscription, so this one is synthesized from
  // the member's products: its ids are empty strings by construction and only the
  // tier and the start date vary.
  const compedSubscriptionMatcher = {
    tier: {
      id: anyObjectId,
      created_at: anyISODateTime,
      updated_at: nullable(anyISODateTime),
      monthly_price_id: anyObjectId,
      yearly_price_id: anyObjectId,
    },
    price: {
      product: { product_id: anyObjectId },
    },
    start_date: anyISODateTimeWithMillis,
  };

  beforeAll(async function () {
    membersAgent = await agentProvider.getMembersAPIAgent();
    await fixtureManager.init('newsletters', 'members:newsletters');

    // Built here rather than taken from the fixtures: `comped@test.com` is
    // `status: 'paid'` despite its name, and a comped member is the only way to
    // reach the synthesized-subscription branch of the assembly.
    const product = await models.Product.findOne({ slug: 'default-product' }, { require: true });
    await models.Member.add(
      {
        email: COMPED_EMAIL,
        name: 'Comped Projection',
        status: 'comped',
        email_disabled: false,
        products: [{ id: product.id }],
      },
      { context: { internal: true } },
    );
  });

  beforeEach(function () {
    // The real URL carries a per-member uuid and an HMAC of it, neither stable
    // across runs; the projection's job is to carry whatever it is handed.
    sinon
      .stub(settingsHelpers, 'createUnsubscribeUrl')
      .returns('http://domain.com/unsubscribe/?uuid=memberuuid&key=abc123dontstealme');
    mockManager.mockMail();
  });

  afterEach(function () {
    mockManager.restore();
  });

  describe('read', function () {
    it('projects a free member', async function () {
      await membersAgent.loginAs(FREE_EMAIL);

      await membersAgent
        .get('/api/member/')
        .expectStatus(200)
        .matchHeaderSnapshot({ etag: anyEtag })
        .matchBodySnapshot(memberMatcher(2));
    });

    it('projects a paid member with their subscriptions', async function () {
      await membersAgent.loginAs('paid@test.com');

      await membersAgent
        .get('/api/member/')
        .expectStatus(200)
        .matchHeaderSnapshot({ etag: anyEtag })
        .matchBodySnapshot({
          ...memberMatcher(1),
          subscriptions: [subscriptionMatcher],
        })
        .expect(({ body }: { body: any }) => {
          // The assembly this suite exists to protect: a paid member's
          // subscription is resolved to its tier and priced, rather than
          // handed over as the raw Stripe row.
          assert.equal(body.status, 'paid');
          assert.equal(body.paid, true);
          assert.equal(body.subscriptions.length, 1);
          assert.ok(body.subscriptions[0].tier, 'subscription carries its tier');
          assert.ok(body.subscriptions[0].price, 'subscription carries its price');
        });
    });

    it('projects a comped member with a synthesized subscription', async function () {
      await membersAgent.loginAs(COMPED_EMAIL);

      await membersAgent
        .get('/api/member/')
        .expectStatus(200)
        .matchHeaderSnapshot({ etag: anyEtag })
        .matchBodySnapshot({
          ...memberMatcher(0),
          subscriptions: [compedSubscriptionMatcher],
        })
        .expect(({ body }: { body: any }) => {
          // A comped member has no Stripe subscription. The one here is built
          // from the member's products, so it is the clearest evidence that the
          // assembly ran rather than the row being passed through.
          assert.equal(body.status, 'comped');
          assert.equal(body.subscriptions.length, 1);
          assert.equal(body.subscriptions[0].plan.nickname, 'Complimentary');
          assert.equal(body.subscriptions[0].id, '');
        });
    });
  });

  describe('write', function () {
    it('applies only the fields a member may change about themselves', async function () {
      await membersAgent.loginAs(WRITABLE_EMAIL);
      const before = await models.Member.findOne({ email: WRITABLE_EMAIL }, { require: true });

      await membersAgent
        .put('/api/member/')
        .body({
          name: 'Renamed',
          expertise: 'Head of Testing',
          // Everything below is outside the write projection. Each is dropped
          // rather than refused, so the rest of the body still applies —
          // `email` is the precedent: it is readable, ignored on write, and
          // changed through a dedicated endpoint that verifies by magic link.
          email: 'somebody-else@example.com',
          status: 'comped',
          labels: [{ name: 'VIP' }],
          uuid: '00000000-0000-0000-0000-000000000000',
          created_at: '2000-01-01T00:00:00.000Z',
        })
        .expectStatus(200)
        .expect(({ body }: { body: any }) => {
          assert.equal(body.name, 'Renamed');
          assert.equal(body.expertise, 'Head of Testing');
          assert.equal(body.email, WRITABLE_EMAIL);
          assert.equal(body.status, 'free');
          assert.equal(body.uuid, before.get('uuid'));
        });

      const after = await models.Member.findOne({ email: WRITABLE_EMAIL }, { require: true });
      assert.equal(after.get('name'), 'Renamed');
      assert.equal(after.get('status'), 'free');
      assert.equal(after.get('uuid'), before.get('uuid'));
      assert.equal((await after.related('labels').fetch()).length, 0);
    });
  });
});
