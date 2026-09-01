import assert from 'node:assert/strict';
import knexLib from 'knex';

const {
  GrantedSubscription,
  MemberAccount,
  StripeSubscription,
} = require('../../../../../../core/server/services/members/account/models');
const NextPaymentCalculator = require('../../../../../../core/server/services/members/members-api/services/next-payment-calculator');
const {
  toAccountResponse,
} = require('../../../../../../core/server/services/members/account/serializers');
const { MemberRow } = require('../../../../../../core/server/services/members/account/schema');
const {
  memberByLookup,
  newslettersForMembers,
  stripeSubscriptionsForMembers,
} = require('../../../../../../core/server/services/members/account/queries');

/**
 * The account projection's own rules.
 *
 * What a member receives is pinned end-to-end over HTTP in
 * `test/e2e-api/members/member-projection.test.ts`, and the queries are exercised
 * against a real database there. These cover the two things that suite cannot:
 * the decisions the codec makes with no database involved, and the shape of the
 * SQL itself — a column this read deliberately does not ask for is invisible in a
 * response body, which is exactly why it needs asserting where it is decided.
 *
 * The queries are compiled rather than run. Knex builds SQL without a connection,
 * so a claim about what a query selects can be checked without a fixture.
 */
describe('member account projection', function () {
  // What a decode needs that no row carries. Plain functions here, because the
  // schemas take them as arguments rather than reaching for anything.
  const deps = {
    nextPayment: () => null,
    unsubscribeUrl: (uuid: string) => `https://example.com/unsubscribe/?uuid=${uuid}`,
    avatarUrl: () => null,
  };

  const memberRow = {
    id: 'm1',
    uuid: 'uuid-1',
    email: 'ada@example.com',
    name: 'Ada Lovelace',
    status: 'free',
    expertise: null,
    commenting: null,
    enable_comment_notifications: true,
    enable_updates_and_announcements: null,
    email_disabled: false,
    created_at: new Date('2020-01-01T00:00:00.000Z'),
    suppression_reason: null,
    suppression_at: null,
  };

  const mysql = knexLib({ client: 'mysql2' });
  const sqlite = knexLib({ client: 'better-sqlite3', useNullAsDefault: true });

  describe('queries', function () {
    it('names nobody rather than failing when the lookup is empty', function () {
      // Ghost identifies the reader on every page view of a themed site and most
      // readers are signed out, so an absent identifier has to mean nobody. A
      // query built with an undefined binding cannot compile at all.
      assert.equal(memberByLookup(mysql, {}), null);
      assert.equal(memberByLookup(mysql, { transient_id: undefined }), null);
    });

    it('looks a member up by each identifier a caller might hold', function () {
      assert.match(memberByLookup(mysql, { id: 'x' }).toString(), /`members`\.`id`/);
      assert.match(memberByLookup(mysql, { email: 'x' }).toString(), /`members`\.`email`/);
      assert.match(memberByLookup(mysql, { uuid: 'x' }).toString(), /`members`\.`uuid`/);
      assert.match(
        memberByLookup(mysql, { transient_id: 'x' }).toString(),
        /`members`\.`transient_id`/,
      );
    });

    it('does not read the labels staff attach to a member', function () {
      // Nothing a member is shown carries them, and this read runs on every
      // request Portal makes.
      assert.doesNotMatch(memberByLookup(mysql, { id: 'x' }).toString(), /labels/);
      assert.doesNotMatch(stripeSubscriptionsForMembers(mysql, ['x']).toString(), /labels/);
    });

    it('orders newsletters in the query rather than after it', function () {
      // MySQL will not accept ORDER BY inside a JSON aggregate, so a projection
      // that aggregated its collections could not state this at all. Kept as its
      // own query, it can.
      assert.match(newslettersForMembers(mysql, ['x']).toString(), /order by `n`\.`sort_order`/i);
    });

    it('compiles identically for both database engines', function () {
      // The reason the collections are separate queries instead of one statement
      // with JSON aggregation: the aggregate functions are spelled differently per
      // engine, and Ghost runs MySQL in production and SQLite in development.
      const strip = (sql: string) => sql.replace(/[`"]/g, '');
      for (const build of [
        (k: never) => memberByLookup(k, { id: 'x' }),
        (k: never) => newslettersForMembers(k, ['x']),
        (k: never) => stripeSubscriptionsForMembers(k, ['x']),
      ]) {
        assert.equal(
          strip(build(mysql as never).toString()),
          strip(build(sqlite as never).toString()),
        );
      }
    });
  });

  describe('rows', function () {
    it('reads a date the way SQLite writes it, in UTC', function () {
      // SQLite has no date type and hands back `yyyy-MM-dd HH:mm:ss`. Passing that
      // to `new Date()` reads it in whatever timezone the machine is set to, which
      // is silently wrong everywhere except UTC — and invisible in this suite,
      // because it runs against MySQL, which returns Date objects already. The
      // shared codec in lib/db-types is what settles it.
      const row = MemberRow.parse({
        id: 'm1',
        uuid: 'uuid-1',
        email: 'ada@example.com',
        name: 'Ada',
        status: 'free',
        expertise: null,
        commenting: null,
        enable_comment_notifications: 1,
        enable_updates_and_announcements: null,
        email_disabled: 0,
        created_at: '2020-06-15 12:00:00',
        suppression_reason: null,
        suppression_at: null,
      });

      assert.equal(row.created_at.toISOString(), '2020-06-15T12:00:00.000Z');
      // And the engine's 0 and 1 arrive as booleans, not numbers.
      assert.equal(row.enable_comment_notifications, true);
      assert.equal(row.email_disabled, false);
    });
  });

  describe('models', function () {
    const tierRow = {
      tier_id: 'tier_1',
      tier_name: 'Default Product',
      tier_slug: 'default-product',
      tier_active: true,
      tier_welcome_page_url: null,
      tier_visibility: 'public',
      tier_trial_days: 0,
      tier_description: null,
      tier_type: 'paid',
      tier_currency: 'usd',
      tier_monthly_price: 500,
      tier_yearly_price: 5000,
      tier_monthly_price_id: 'p_m',
      tier_yearly_price_id: 'p_y',
      tier_created_at: new Date('2020-01-01T00:00:00.000Z'),
      tier_updated_at: null,
      tier_expiry_at: null,
    };

    const grantedRow = (status: string) => ({
      ...tierRow,
      member_id: 'm1',
      customer_name: 'Ada',
      customer_email: 'ada@example.com',
      member_status: status,
      granted_at: new Date('2021-06-01T00:00:00.000Z'),
    });

    // Every column the read selects for a Stripe-backed subscription. Spelled out
    // rather than built, because what this exercises is precisely a disagreement
    // about spelling.
    const stripeRow = {
      ...tierRow,
      member_id: 'm1',
      customer_id: 'cus_1',
      customer_name: 'Ada',
      customer_email: 'ada@example.com',
      ghost_subscription_row_id: 'sub_row_1',
      subscription_id: 'sub_1',
      status: 'active',
      cancel_at_period_end: false,
      cancellation_reason: null,
      current_period_end: new Date('2999-02-01T00:00:00.000Z'),
      start_date: new Date('2020-01-01T00:00:00.000Z'),
      default_payment_card_last4: '4242',
      trial_start_at: null,
      trial_end_at: null,
      discount_start: null,
      discount_end: null,
      offer_id: null,
      plan_id: 'plan_1',
      plan_nickname: 'Monthly',
      plan_interval: 'month',
      plan_amount: 500,
      plan_currency: 'usd',
      price_row_id: 'price_row_1',
      price_stripe_id: 'price_stripe_1',
      price_nickname: 'Monthly',
      price_amount: 500,
      price_currency: 'usd',
      price_interval: 'month',
      price_type: 'recurring',
      stripe_product_row_id: 'prod_row_1',
      stripe_product_id: 'prod_1',
    };

    /**
     * What is owed next, worked out by the calculator that really does it.
     *
     * The other model tests hand the decode a `nextPayment` stub, which cannot see
     * what it was passed. That is the hole this closes: the calculator belongs to
     * another module and reads a subscription by the API's spelling, so a model
     * handing over its own leaves every date it looks for undefined. Nothing
     * throws — a discount simply stops being found, and a member is quietly shown
     * a price that is too high.
     */
    describe('what is owed next', function () {
      const calculator = new NextPaymentCalculator();
      const withRealCalculator = {
        ...deps,
        nextPayment: (subscription: unknown) => calculator.calculate(subscription),
      };

      const offer = {
        id: 'offer_1',
        type: 'percent',
        amount: 10,
        duration: 'once',
        duration_in_months: null,
        redemption_type: 'retention',
      };

      it('takes a discount that is still running off the next payment', function () {
        const subscription = StripeSubscription(withRealCalculator).parse({
          ...stripeRow,
          offer_id: offer.id,
          discount_start: new Date('2020-06-01T00:00:00.000Z'),
          discount_end: new Date('2999-06-01T00:00:00.000Z'),
          offer,
          offer_redemptions: [],
          attribution: null,
        });

        assert.ok(subscription.nextPayment.discount, 'the discount is found at all');
        assert.equal(subscription.nextPayment.discount.offer_id, offer.id);
        assert.equal(subscription.nextPayment.original_amount, 500);
        assert.equal(subscription.nextPayment.amount, 450);
      });

      it('charges the full amount when no offer applies', function () {
        const subscription = StripeSubscription(withRealCalculator).parse({
          ...stripeRow,
          offer: null,
          offer_redemptions: [],
          attribution: null,
        });

        assert.equal(subscription.nextPayment.discount, null);
        assert.equal(subscription.nextPayment.amount, 500);
      });
    });

    it('builds a complimentary subscription that costs nothing', function () {
      const sub = GrantedSubscription(deps).parse({
        ...grantedRow('comped'),
        gift: null,
        now: new Date(),
      });

      // A client reads this beside a Stripe-backed subscription, so it carries the
      // same shape: an empty id where Stripe would have one, and a masked card.
      assert.equal(sub.id, '');
      assert.equal(sub.plan.nickname, 'Complimentary');
      assert.equal(sub.plan.amount, 0);
      assert.equal(sub.defaultPaymentCardLast4, '****');
      assert.equal(sub.status, 'active');
      assert.equal(sub.tier.id, 'tier_1');
    });

    it('prices a gifted subscription from the gift', function () {
      const gift = { member_id: 'm1', cadence: 'month', currency: 'EUR', amount: 500 };
      const sub = GrantedSubscription(deps).parse({ ...grantedRow('gift'), gift, now: new Date() });

      assert.equal(sub.plan.nickname, 'Gift subscription');
      assert.equal(sub.plan.interval, 'month');
      assert.equal(sub.plan.currency, 'EUR');
      assert.equal(sub.plan.amount, 500);
    });

    it('falls back to a free yearly plan for a gift it cannot find', function () {
      const sub = GrantedSubscription(deps).parse({
        ...grantedRow('gift'),
        gift: null,
        now: new Date(),
      });

      assert.equal(sub.plan.interval, 'year');
      assert.equal(sub.plan.amount, 0);
    });

    it('dates a granted subscription from the grant, and the clock when there is none', function () {
      const granted = GrantedSubscription(deps).parse({
        ...grantedRow('comped'),
        gift: null,
        now: new Date(),
      });
      assert.equal(granted.startDate.toISOString(), '2021-06-01T00:00:00.000Z');

      const now = new Date('2022-02-02T00:00:00.000Z');
      const ungranted = GrantedSubscription(deps).parse({
        ...grantedRow('comped'),
        granted_at: null,
        gift: null,
        now,
      });
      // Long-standing: such a member's start date moves every time it is read.
      // Preserved here rather than quietly corrected.
      assert.equal(ungranted.startDate, now);
    });

    const decode = (overrides = {}) =>
      MemberAccount(deps).parse({
        ...memberRow,
        ...overrides,
        newsletters: [],
        stripeSubscriptions: [],
        grantedSubscriptions: [],
      });

    it('keeps dates as dates', function () {
      // The model is the domain's answer, so a date stays a date here; turning it
      // into the string the API has always sent is the serializer's job.
      assert.ok(decode().createdAt instanceof Date);
    });

    it('treats a suppressed address and a switched-off one the same way', function () {
      assert.equal(decode().emailSuppression.suppressed, false);
      assert.equal(decode({ email_disabled: true }).emailSuppression.suppressed, true);

      const bounced = decode({ suppression_reason: 'bounce' });
      assert.equal(bounced.emailSuppression.suppressed, true);
      assert.equal(bounced.emailSuppression.info.reason, 'fail');

      assert.equal(decode({ suppression_reason: 'spam' }).emailSuppression.info.reason, 'spam');
    });

    it('carries the commenting record rather than its serialized form', function () {
      assert.equal(decode().commenting.canComment, true);
    });
  });

  describe('serializer', function () {
    const account = () =>
      MemberAccount(deps).parse({
        ...memberRow,
        newsletters: [],
        stripeSubscriptions: [],
        grantedSubscriptions: [],
      });

    it('writes the account the way the API has always written it', function () {
      const wire = toAccountResponse(account());

      // Dates become the ISO strings a client already parses, and the keys become
      // the ones it already reads.
      assert.equal(wire.created_at, '2020-01-01T00:00:00.000Z');
      assert.equal(wire.enable_comment_notifications, true);
      assert.deepEqual(wire.commenting, {
        disabled: false,
        disabled_reason: null,
        disabled_until: null,
      });
      assert.equal(wire.can_comment, true);
    });

    it('derives the two fields that exist only for this audience', function () {
      const wire = toAccountResponse({ ...account(), name: 'Ada Lovelace', status: 'comped' });

      // Neither is stored, and neither appears in the Admin API's view of the same
      // member: the account response is not a subset of the admin one.
      assert.equal(wire.firstname, 'Ada');
      assert.equal(wire.paid, true);
    });

    it('reports a member with any kind of access as paid', function () {
      for (const status of ['comped', 'gift', 'paid']) {
        assert.equal(toAccountResponse({ ...account(), status }).paid, true, status);
      }
      assert.equal(toAccountResponse({ ...account(), status: 'free' }).paid, false);
    });

    it('has no first name to report when a member has no name', function () {
      assert.equal(toAccountResponse({ ...account(), name: null }).firstname, null);
    });

    it('writes newsletters the way the API spells them', function () {
      const withNewsletter = MemberAccount(deps).parse({
        ...memberRow,
        newsletters: [
          {
            member_id: 'm1',
            id: 'n1',
            uuid: 'newsletter-uuid',
            name: 'Weekly',
            description: null,
            sort_order: 2,
            status: 'active',
          },
        ],
        stripeSubscriptions: [],
        grantedSubscriptions: [],
      });

      // `status` is read but not published: the query needs it, a member has no
      // use for it, and adding it now would widen the response.
      assert.deepEqual(toAccountResponse(withNewsletter).newsletters, [
        { id: 'n1', uuid: 'newsletter-uuid', name: 'Weekly', description: null, sort_order: 2 },
      ]);
    });

    it('does not carry the member id', function () {
      // The model has one because a read needs it; a member is addressed by uuid.
      assert.equal(Object.hasOwn(toAccountResponse(account()), 'id'), false);
    });

    it('answers null for no account', function () {
      assert.equal(toAccountResponse(null), null);
    });
  });
});
