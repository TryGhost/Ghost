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
  let offerCounter = 0;
  interface MembersAgent {
    get: (_url: string) => any;
    put: (_url: string) => any;
    loginAs: (_email: string) => Promise<any>;
    // Same site, its own session. What a signed-out request gets back is part of
    // the contract, and asking through an agent that other tests sign in would
    // only answer that while this ran first.
    duplicate: () => MembersAgent;
  }
  let membersAgent: MembersAgent;
  // An admin agent alongside the member's own, because some of what a member is
  // shown can only be set up through the Admin API: an offer, a suspended
  // commenting state. Both agents talk to the same site.
  let adminAgent: {
    get: (_url: string) => any;
    post: (_url: string) => any;
    put: (_url: string) => any;
    loginAsOwner: () => Promise<any>;
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

  // The same subscription once an offer is discounting it. Named separately rather
  // than folded into the one above, because the extra keys only exist while a
  // discount is attached, and a snapshot is the only thing that notices one of them
  // quietly going missing.
  const discountedSubscriptionMatcher = {
    ...subscriptionMatcher,
    discount_start: anyISODateTime,
    discount_end: nullable(anyISODateTime),
    offer: {
      id: anyObjectId,
      created_at: anyISODateTime,
      name: anyString,
      code: anyString,
    },
    next_payment: {
      discount: {
        offer_id: anyObjectId,
        start: anyISODateTime,
        end: nullable(anyISODateTime),
      },
    },
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
    ({ adminAgent, membersAgent } = await agentProvider.getAgentsForMembers());
    await fixtureManager.init('newsletters', 'members:newsletters');
    // After the fixtures, which are what install the owner to log in as.
    await adminAgent.loginAsOwner();

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
    it('answers a request with nobody signed in', async function () {
      // A duplicate of this suite's agent: same site, no session. Asking through
      // the shared agent would only be signed out while this happened to run
      // before every test that signs in.
      const signedOut = membersAgent.duplicate();

      const { statusCode } = await signedOut.get('/api/member/');

      // The route decides this, rather than it falling out of a handler failing:
      // reading who you are is the one place where not knowing is an ordinary
      // answer, because a themed page asks on every view.
      assert.equal(statusCode, 204);
    });

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

    /**
     * Subscription states no snapshot above reaches.
     *
     * Every pinned member is on a live subscription, so the branches that decide
     * a member is owed nothing next, or is on a trial, or has asked to stop, are
     * all unexercised. Each is a shape Portal has to render.
     */
    describe('subscription states', function () {
      const knex = () => models.Base.knex;

      const patchSubscription = async (
        email: string,
        patch: Record<string, unknown>,
        check: (body: any) => Promise<void> | void,
      ) => {
        const rows = await knex()('members_stripe_customers_subscriptions as mscs')
          .join('members_stripe_customers as msc', 'msc.customer_id', 'mscs.customer_id')
          .join('members as m', 'm.id', 'msc.member_id')
          .where('m.email', email)
          .select('mscs.id');
        const ids = rows.map((row: { id: string }) => row.id);
        // A join that matched nothing patches nothing, and the case then reads a
        // subscription still in its fixture state. Said here so that a fixture
        // this stops finding fails as itself rather than as a projection that
        // appears to have stopped reporting what it was told.
        assert.ok(ids.length > 0, `${email} has a subscription to patch`);
        const before = await knex()('members_stripe_customers_subscriptions')
          .whereIn('id', ids)
          .select(['id', ...Object.keys(patch)]);

        // Signed in before asking, like the other two helpers here. Without it the
        // request carries whichever session the last test left, so these cases
        // either answer 204 on their own or quietly assert against a different
        // member than the one whose rows were patched.
        await membersAgent.loginAs(email);

        try {
          await knex()('members_stripe_customers_subscriptions').whereIn('id', ids).update(patch);
          const { body } = await membersAgent.get('/api/member/').expectStatus(200);
          await check(body);
        } finally {
          for (const row of before) {
            const { id, ...columns } = row;
            await knex()('members_stripe_customers_subscriptions').where('id', id).update(columns);
          }
        }
      };

      it('says nothing is owed next on a subscription that has ended', async function () {
        await patchSubscription(
          'paid@test.com',
          { status: 'canceled', cancellation_reason: 'Too expensive' },
          (body) => {
            const [subscription] = body.subscriptions;
            assert.equal(subscription.status, 'canceled');
            assert.equal(subscription.cancellation_reason, 'Too expensive');
            // Nothing is owed on a subscription that is over, which is a different
            // answer from owing the full amount.
            assert.equal(subscription.next_payment, null);
          },
        );
      });

      it('carries the trial dates and the pending cancellation', async function () {
        const trialStart = new Date('2020-02-01T00:00:00.000Z');
        const trialEnd = new Date('2999-02-01T00:00:00.000Z');

        await patchSubscription(
          'paid@test.com',
          { cancel_at_period_end: true, trial_start_at: trialStart, trial_end_at: trialEnd },
          (body) => {
            const [subscription] = body.subscriptions;
            // A member who has asked to stop still has a live subscription until
            // the period ends, so both facts have to reach them.
            assert.equal(subscription.cancel_at_period_end, true);
            assert.equal(subscription.status, 'active');
            assert.equal(subscription.trial_start_at, trialStart.toISOString());
            assert.equal(subscription.trial_end_at, trialEnd.toISOString());
            assert.ok(subscription.next_payment, 'a pending cancellation still owes the next one');
          },
        );
      });
    });

    /**
     * Whether Ghost thinks it can email this member, and why not.
     *
     * Two independent facts reach the member as one: a suppression row written
     * because mail bounced or was marked as spam, and a flag set on the member.
     * Every snapshot above has neither, so the whole branch is unexercised.
     */
    describe('email suppression', function () {
      const knex = () => models.Base.knex;

      const withSuppression = async (
        email: string,
        row: { reason: string } | null,
        memberPatch: Record<string, unknown>,
        check: (body: any) => Promise<void> | void,
      ) => {
        // Signed in first, which is also what creates this member on a site that
        // has never seen them. Looking them up before that leaves these cases
        // depending on an earlier test having signed the same member in, which is
        // a dependency that only shows up when one of them is run on its own.
        await membersAgent.loginAs(email);
        const member = await knex()('members').where('email', email).first('id', 'email_disabled');

        try {
          if (row) {
            await knex()('suppressions').insert({
              id: new Array(24).fill('a').join('').slice(0, 24),
              email,
              email_id: null,
              reason: row.reason,
              created_at: new Date('2021-01-01T00:00:00.000Z'),
            });
          }
          if (Object.keys(memberPatch).length > 0) {
            await knex()('members').where('id', member.id).update(memberPatch);
          }

          const { body } = await membersAgent.get('/api/member/').expectStatus(200);
          await check(body);
        } finally {
          await knex()('suppressions').where('email', email).delete();
          await knex()('members')
            .where('id', member.id)
            .update({ email_disabled: member.email_disabled });
        }
      };

      it('reports a bounce as a failure, with when it happened', async function () {
        await withSuppression(FREE_EMAIL, { reason: 'bounce' }, {}, (body) => {
          assert.equal(body.email_suppression.suppressed, true);
          // The wire says `fail`, not `bounce`: the two reasons a member is told
          // apart are spam and everything else.
          assert.equal(body.email_suppression.info.reason, 'fail');
          assert.ok(body.email_suppression.info.timestamp);
        });
      });

      it('reports a spam complaint as spam', async function () {
        await withSuppression(FREE_EMAIL, { reason: 'spam' }, {}, (body) => {
          assert.equal(body.email_suppression.suppressed, true);
          assert.equal(body.email_suppression.info.reason, 'spam');
        });
      });

      it('reports a disabled member as suppressed with no reason to give', async function () {
        await withSuppression(FREE_EMAIL, null, { email_disabled: true }, (body) => {
          // Suppressed because the member is flagged rather than because mail
          // failed, so there is no suppression row and nothing to say about why.
          assert.equal(body.email_suppression.suppressed, true);
          assert.equal(body.email_suppression.info, null);
        });
      });
    });

    /**
     * What an offer does to what a member is told they owe next.
     *
     * None of the snapshots above puts an offer on a subscription, so every one of
     * them prices a subscription with nothing discounting it. That gap let a real
     * regression through: the discount silently stopped being found, the amount
     * still looked plausible, and Portal quietly stopped showing the offer label.
     *
     * These drive the offer through the Admin API and the discount window through
     * the columns Stripe fills in, because that is how both really arrive.
     */
    describe('an offer on a subscription', function () {
      const knex = () => models.Base.knex;
      const DAY = 24 * 60 * 60 * 1000;

      const subscriptionRowsFor = async (email: string) =>
        knex()('members_stripe_customers_subscriptions as mscs')
          .join('members_stripe_customers as msc', 'msc.customer_id', 'mscs.customer_id')
          .join('members as m', 'm.id', 'msc.member_id')
          .where('m.email', email)
          .select('mscs.id');

      const createOffer = async (overrides: Record<string, unknown>) => {
        offerCounter += 1;
        const suffix = `${Date.now().toString(16)}-${offerCounter}`;
        const { body } = await adminAgent
          .post('offers/')
          .body({
            offers: [
              {
                name: `Projection offer ${suffix}`,
                code: `projection-offer-${suffix}`,
                display_title: '',
                display_description: '',
                type: 'percent',
                cadence: 'month',
                amount: 10,
                duration: 'forever',
                duration_in_months: null,
                currency_restriction: false,
                currency: null,
                status: 'active',
                redemption_type: 'retention',
                tier: null,
                ...overrides,
              },
            ],
          })
          .expectStatus(200);
        return body.offers[0];
      };

      /**
       * Put an offer on this member's subscription for the length of one check.
       *
       * Restored afterwards rather than left in place, so these cases cannot move
       * the snapshots the tests above take of the same member.
       */
      const withOffer = async (
        email: string,
        offer: { id: string },
        window: { discount_start: Date | null; discount_end: Date | null },
        check: (body: any) => Promise<void> | void,
        snapshot?: Record<string, unknown>,
      ) => {
        const rows = await subscriptionRowsFor(email);
        const before = await knex()('members_stripe_customers_subscriptions')
          .whereIn(
            'id',
            rows.map((row: { id: string }) => row.id),
          )
          .select('id', 'offer_id', 'discount_start', 'discount_end');

        try {
          await knex()('members_stripe_customers_subscriptions')
            .whereIn(
              'id',
              rows.map((row: { id: string }) => row.id),
            )
            .update({ offer_id: offer.id, ...window });

          await membersAgent.loginAs(email);
          const request = membersAgent.get('/api/member/').expectStatus(200);
          if (snapshot) {
            request.matchHeaderSnapshot({ etag: anyEtag }).matchBodySnapshot(snapshot);
          }
          const { body } = await request;
          await check(body);
        } finally {
          for (const row of before) {
            await knex()('members_stripe_customers_subscriptions').where('id', row.id).update({
              offer_id: row.offer_id,
              discount_start: row.discount_start,
              discount_end: row.discount_end,
            });
          }
        }
      };

      it('takes a percentage off while the discount is running', async function () {
        const offer = await createOffer({ type: 'percent', amount: 10, duration: 'forever' });

        await withOffer(
          'paid@test.com',
          offer,
          { discount_start: new Date(Date.now() - DAY), discount_end: null },
          (body) => {
            const [subscription] = body.subscriptions;
            assert.ok(subscription.offer, 'the subscription carries the offer it was given');
            assert.equal(subscription.offer.id, offer.id);
            assert.ok(subscription.next_payment.discount, 'the discount is found');
            assert.equal(subscription.next_payment.discount.offer_id, offer.id);
            assert.equal(subscription.next_payment.discount.type, 'percent');
            assert.equal(
              subscription.next_payment.amount,
              Math.round(subscription.next_payment.original_amount * 0.9),
            );
            // Only present on a Stripe-backed subscription, and only once a
            // discount window exists on the row.
            assert.ok(subscription.discount_start, 'the window start reaches the member');
          },
          { ...memberMatcher(1), subscriptions: [discountedSubscriptionMatcher] },
        );
      });

      it('takes a fixed amount off while the discount is running', async function () {
        const offer = await createOffer({
          type: 'fixed',
          amount: 100,
          currency: 'gbp',
          duration: 'forever',
        });

        await withOffer(
          'paid@test.com',
          offer,
          { discount_start: new Date(Date.now() - DAY), discount_end: null },
          (body) => {
            const [subscription] = body.subscriptions;
            assert.equal(subscription.next_payment.discount.type, 'fixed');
            assert.equal(
              subscription.next_payment.amount,
              subscription.next_payment.original_amount - 100,
            );
          },
        );
      });

      it('charges the full amount once the discount has run out', async function () {
        const offer = await createOffer({ duration: 'repeating', duration_in_months: 3 });

        await withOffer(
          'paid@test.com',
          offer,
          {
            discount_start: new Date(Date.now() - 90 * DAY),
            discount_end: new Date(Date.now() - DAY),
          },
          (body) => {
            const [subscription] = body.subscriptions;
            // The offer is still attached and still reported. What changed is that
            // it no longer bears on what is owed next, which is a different fact
            // and is why both are in the response.
            assert.ok(subscription.offer, 'the offer is still named');
            assert.equal(subscription.next_payment.discount, null);
            assert.equal(
              subscription.next_payment.amount,
              subscription.next_payment.original_amount,
            );
          },
        );
      });

      it('charges the full amount for a free-trial offer', async function () {
        const offer = await createOffer({ type: 'trial', amount: 14, duration: 'trial' });

        await withOffer(
          'paid@test.com',
          offer,
          { discount_start: new Date(Date.now() - DAY), discount_end: null },
          (body) => {
            const [subscription] = body.subscriptions;
            // A trial offer changes when the next payment falls, not what it is.
            assert.equal(subscription.next_payment.discount, null);
            assert.equal(
              subscription.next_payment.amount,
              subscription.next_payment.original_amount,
            );
          },
        );
      });
    });

    it('includes a newsletter the publisher has archived', async function () {
      // Archived newsletters are excluded from what a publisher offers, but a
      // member already on one keeps receiving it, so it stays in their list.
      // Pinned because nothing said either way, and the write path depends on it:
      // a client round-tripping this list must not unsubscribe them.
      const archived = await models.Base.knex('newsletters')
        .where('status', 'archived')
        .select('id');
      assert.ok(archived.length > 0, 'the site has an archived newsletter to test with');

      await membersAgent.loginAs('vip@test.com');

      const { body } = await membersAgent.get('/api/member/').expectStatus(200);
      const ids = body.newsletters.map((newsletter: { id: string }) => newsletter.id);

      // The point of the case, rather than the list merely being non-empty: one of
      // the newsletters a member is told they receive is one the publisher has
      // stopped offering.
      assert.ok(
        archived.some((newsletter: { id: string }) => ids.includes(newsletter.id)),
        'an archived newsletter is still listed for the member',
      );
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

    it('trims the whitespace around an expertise', async function () {
      await membersAgent.loginAs(WRITABLE_EMAIL);

      const { body } = await membersAgent
        .put('/api/member/')
        .body({ expertise: '  Head of Testing  ' })
        .expectStatus(200);

      // Trimmed on the way in rather than on the way out, so what is stored is
      // what every other reader of this member sees too.
      assert.equal(body.expertise, 'Head of Testing');
    });

    it('sets the newsletters a member asked for, and says so back', async function () {
      await membersAgent.loginAs(WRITABLE_EMAIL);
      const active = await models.Base.knex('newsletters')
        .where('status', 'active')
        .orderBy('sort_order', 'asc')
        .select('id', 'name');
      assert.ok(active.length > 0, 'the site offers a newsletter to subscribe to');

      const { body } = await membersAgent
        .put('/api/member/')
        .body({ newsletters: [{ id: active[0].id }] })
        .expectStatus(200);

      // The response is the member re-read, not the request echoed, so this is
      // also what says the write reached the join table rather than being dropped.
      assert.deepEqual(
        body.newsletters.map((newsletter: { id: string }) => newsletter.id),
        [active[0].id],
      );
    });

    it('unsubscribes and resubscribes a member through the one flag', async function () {
      await membersAgent.loginAs(WRITABLE_EMAIL);

      const { body: off } = await membersAgent
        .put('/api/member/')
        .body({ subscribed: false })
        .expectStatus(200);
      assert.deepEqual(off.newsletters, [], 'false detaches every newsletter');

      const { body: on } = await membersAgent
        .put('/api/member/')
        .body({ subscribed: true })
        .expectStatus(200);

      // `subscribed` is older than newsletters being a list, and it still has to
      // mean something. With none attached it re-subscribes the member to the
      // ones a publisher puts new signups on, which is not the same as restoring
      // what they had before, so the set is named rather than counted.
      const onSignup = await models.Base.knex('newsletters')
        .where({ status: 'active', subscribe_on_signup: true, visibility: 'members' })
        .orderBy('sort_order', 'asc')
        .select('id');

      assert.deepEqual(
        on.newsletters.map((newsletter: { id: string }) => newsletter.id).sort(),
        onSignup.map((newsletter: { id: string }) => newsletter.id).sort(),
      );
    });
  });
});
