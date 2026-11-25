/**
 * What Ghost's Stripe webhook does today for every kind of event and failure seen on Ghost(Pro):
 * the HTTP status Ghost responds with, which decides whether Stripe retries the event, what Ghost
 * writes to its own tables and to Stripe, and the spans it records. Several of these outcomes are
 * bugs or publisher setup problems. The tests pin them as they are, so a change to any of them
 * shows up here as a deliberate change to its test.
 *
 * Events arrive over HTTP, signed as Stripe signs them. Stripe's API is the suite's stateful fake,
 * which holds the objects each test creates, so a test pins what Ghost does rather than which
 * requests it makes to Stripe on the way.
 */
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import Stripe from 'stripe';
import type * as Framework from '../../utils/e2e-framework';

// Loaded with `require` rather than `import`, because under Vitest an `import` of a CommonJS
// module gets a separate copy of it. With `require`, the test shares the module instances Ghost
// boots with, so the mock manager's stubs reach Ghost and its `restore` removes them.
const { agentProvider, mockManager, fixtureManager } = require('../../utils/e2e-framework');
const models = require('../../../core/server/models');
const db = require('../../../core/server/data/db');
const { tables } = require('../../../core/server/data/schema');
const config = require('../../../core/shared/config');
const StripeAPI = require('../../../core/server/services/stripe/stripe-api');
const DomainEvents = require('@tryghost/domain-events');

type Agents = Awaited<ReturnType<typeof Framework.agentProvider.getAgentsForMembers>>;

interface TrackedSpan {
  event: { outcome: string };
  error?: { type: string };
  labels?: Record<string, unknown>;
}

interface MockedMetrics {
  tracked: (_name: string) => TrackedSpan[];
}

/** A span as a test pins it: its outcome, the type of its error when it failed, and its attributes. */
type Span = Record<string, unknown>;

/** How Stripe answers a request it fails: a status and a body, or an error before any response. */
type StripeFailure = readonly [number, object] | NodeJS.ErrnoException;

interface StripePrice {
  id: string;
  product: string;
  unit_amount: number;
}

/** A Stripe event to deliver, and how: at another API version, or signed with another secret. */
interface Delivery {
  type: string;
  object: object;
  apiVersion?: string;
  secret?: string;
}

/** Everything a delivery of an event does that a caller depends on. */
interface Outcome {
  /** The HTTP status Ghost responds with to each delivery, which decides whether Stripe retries. */
  status: number;
  /**
   * What Ghost writes: `'nothing'`, checked against every table and every object Stripe holds
   * after each delivery, or a check of what it wrote, run after each delivery.
   */
  writes: 'nothing' | ((attempt: number) => Promise<void>);
  /** The `stripe.webhook` span each delivery records. */
  webhook: Span;
  /** The `stripe_checkout.complete` span each delivery records, or `null` when it records none. */
  checkout: Span | null;
  /** How many times the event is delivered: 2 pins what Stripe's retry of a failed event does. */
  attempts?: 1 | 2;
}

/** A case whose event writes nothing: the event to send, set up as the case needs, and what it does. */
interface NothingWritten extends Omit<Outcome, 'writes'> {
  name: string;
  event: () => Delivery | Promise<Delivery>;
}

/** The Stripe product of the paid tier in the members fixtures, and its monthly USD price. */
const FIXTURE_PRODUCT = '109c85c734fb9992e7bc30a26af66c22f5c94d8dc62e0a33cb797be902c06b2d';
const FIXTURE_PRICE = '173e16a1fffa7d232b398e4a9b08d266a456ae8f3d23e5f11cc608ced6730b12';

/**
 * A buyer's name longer than the 191 characters Ghost stores, as Stripe accepts, and the name
 * Ghost saves for it: its first 191 characters. The cut falls on an emoji, which counts as one
 * character and is kept whole.
 */
const LONG_NAME = `${'x'.repeat(190)}${'🙂'.repeat(10)}`;
const FITTED_NAME = `${'x'.repeat(190)}🙂`;

/** Stripe's error responses, as Stripe returns them for each failure seen in production. */
const STRIPE: Record<'accessRevoked' | 'locked', StripeFailure> = {
  accessRevoked: [
    401,
    {
      error: {
        type: 'invalid_request_error',
        code: 'platform_api_key_expired',
        message: 'Expired API Key provided: sk_live_***. Platform access may have been revoked.',
      },
    },
  ],
  locked: [
    429,
    {
      error: {
        type: 'invalid_request_error',
        code: 'lock_timeout',
        message:
          'This object cannot be accessed right now because another API request or Stripe process is currently accessing it.',
      },
    },
  ],
};

/** Signs events as Stripe does. The client is only used for signing, so it never makes a request. */
const signer = new Stripe('sk_test_signing_only', { apiVersion: '2020-08-27' }).webhooks;

function stripeId(prefix: string) {
  return `${prefix}_${crypto.randomBytes(12).toString('hex')}`;
}

function now() {
  return Math.floor(Date.now() / 1000);
}

/** A span that succeeded with `labels`, or failed with an `error` of that type. */
function span(labels: Span, error?: string): Span {
  return error ? { outcome: 'failure', error, ...labels } : { outcome: 'success', ...labels };
}

/** A completed checkout's span, which records whether it asked for a shipping address or a phone. */
function checkoutSpan(labels: Span, error?: string): Span {
  return span({ ...labels, shipping: 'none', phone: 'none' }, error);
}

/** What a failed span records about its failure: why it failed, and who can fix it. */
function failedBecause(reason: string, owner: 'ghost' | 'dependency' | 'site'): Span {
  return { result: 'failed', reason, owner };
}

function spansOf(metrics: MockedMetrics, name: string): Span[] {
  return metrics.tracked(name).map(({ event, error, labels }) => ({
    outcome: event.outcome,
    ...(error ? { error: error.type } : {}),
    ...labels,
  }));
}

describe('Stripe webhook outcomes', function () {
  const { stripeMocker } = mockManager;
  let membersAgent: Agents['membersAgent'];
  let metrics: MockedMetrics;

  /** Makes Stripe fail every request, or only those for one object, with `reply`. */
  function stripeFails(reply: StripeFailure, only?: { resource: string; id: string }) {
    stripeMocker.failures.push({ ...only, reply });
  }

  /** A Stripe price, which Stripe holds from now on. The fixture tier's own price by default. */
  function priceFor(
    product = FIXTURE_PRODUCT,
    id = product === FIXTURE_PRODUCT ? FIXTURE_PRICE : stripeId('price'),
  ): StripePrice {
    const existing = stripeMocker.prices.find((price: StripePrice) => price.id === id);
    if (existing) {
      return existing;
    }
    const price = {
      id,
      object: 'price',
      product,
      active: true,
      nickname: 'Monthly',
      currency: 'usd',
      unit_amount: 500,
      type: 'recurring',
      recurring: { interval: 'month' },
    };
    stripeMocker.prices.push(price);
    if (!stripeMocker.products.some((known: { id: string }) => known.id === product)) {
      stripeMocker.products.push({ id: product, object: 'product', name: 'A tier', active: true });
    }
    return price;
  }

  /**
   * A Stripe subscription, by default to the fixture tier's monthly price, as Stripe returns it at
   * Ghost's API version. Stripe holds it from now on.
   */
  function subscriptionFor(
    customerId: string,
    {
      prices = [priceFor()],
      discount = null,
    }: { prices?: StripePrice[]; discount?: object | null } = {},
  ) {
    const subscription = {
      id: stripeId('sub'),
      object: 'subscription',
      customer: customerId,
      status: 'active',
      items: {
        object: 'list',
        data: prices.map((price) => ({ id: stripeId('si'), object: 'subscription_item', price })),
      },
      plan:
        prices.length === 1
          ? {
              id: prices[0].id,
              object: 'plan',
              product: prices[0].product,
              amount: prices[0].unit_amount,
              currency: 'usd',
              interval: 'month',
              nickname: 'Monthly',
            }
          : null,
      start_date: now(),
      current_period_end: now() + 60 * 60 * 24 * 31,
      cancel_at_period_end: false,
      canceled_at: null,
      trial_start: null,
      trial_end: null,
      default_payment_method: null,
      discount,
      metadata: {},
    };
    stripeMocker.subscriptions.push(subscription);
    return subscription;
  }

  /**
   * A new Stripe customer with one subscription to the fixture tier, both of which Stripe holds.
   * With a `cardholder`, the subscription is paid by a card in that name, which the customer lists
   * expanded, as Ghost fetches it.
   */
  function stripeCustomer({
    email = `${stripeId('buyer')}@example.com`,
    name = 'Checkout Buyer',
    cardholder,
  }: { email?: string; name?: string; cardholder?: string } = {}) {
    const id = stripeId('cus');
    const subscription = subscriptionFor(id);
    const listed = cardholder
      ? {
          ...subscription,
          default_payment_method: {
            id: stripeId('pm'),
            object: 'payment_method',
            type: 'card',
            billing_details: { name: cardholder, email: null, phone: null, address: null },
            card: { brand: 'visa', last4: '4242', exp_month: 12, exp_year: 2034, country: 'GB' },
          },
        }
      : subscription;
    const customer = {
      id,
      object: 'customer',
      email,
      name,
      subscriptions: { object: 'list', data: [listed] },
    };
    stripeMocker.customers.push(customer);
    return { customer, subscription };
  }

  /** Adds a subscription to a customer Stripe holds, as Stripe lists it on the customer. */
  function addSubscription(
    customer: { id: string; subscriptions: { data: object[] } },
    options: Parameters<typeof subscriptionFor>[1] = {},
  ) {
    const subscription = subscriptionFor(customer.id, options);
    customer.subscriptions.data.push(subscription);
    return subscription;
  }

  /** A completed subscription checkout, as Stripe sends one at Ghost's API version. */
  function subscriptionCheckout(
    {
      customer,
      subscription,
    }: { customer: { id: string; email: string; name: string }; subscription: { id: string } },
    metadata: Record<string, string> = {},
  ) {
    return {
      id: stripeId('cs'),
      object: 'checkout.session',
      mode: 'subscription',
      status: 'complete',
      payment_status: 'paid',
      created: now(),
      expires_at: now() + 60 * 60 * 24,
      livemode: false,
      amount_subtotal: 500,
      amount_total: 500,
      currency: 'usd',
      customer: customer.id,
      customer_email: null,
      customer_details: {
        email: customer.email,
        name: customer.name,
        phone: null,
        address: null,
        tax_exempt: 'none',
        tax_ids: [],
      },
      subscription: subscription.id,
      payment_intent: null,
      setup_intent: null,
      payment_link: null,
      shipping: null,
      custom_fields: [],
      metadata,
    };
  }

  /** A completed one-off payment checkout, such as a gift or a donation, at Ghost's API version. */
  function paymentCheckout({
    paymentStatus = 'paid',
    metadata = {},
    amount = 1200,
    email = `${stripeId('payer')}@example.com`,
    name = 'Payer',
    id = stripeId('cs'),
  }: {
    paymentStatus?: 'paid' | 'unpaid';
    metadata?: Record<string, string>;
    amount?: number;
    email?: string;
    name?: string;
    id?: string;
  } = {}) {
    return {
      id,
      object: 'checkout.session',
      mode: 'payment',
      status: 'complete',
      payment_status: paymentStatus,
      created: now(),
      livemode: false,
      amount_subtotal: amount,
      amount_total: amount,
      currency: 'usd',
      customer: null,
      customer_email: email,
      customer_details: {
        email,
        name,
        phone: null,
        address: null,
        tax_exempt: 'none',
        tax_ids: [],
      },
      payment_intent: stripeId('pi'),
      setup_intent: null,
      subscription: null,
      payment_link: null,
      shipping: null,
      custom_fields: [],
      metadata,
    };
  }

  /**
   * A completed card update, as Stripe sends one for the session Ghost creates: Ghost names the
   * member's Stripe customer only in the setup intent's metadata, so the session has no customer.
   */
  function cardUpdateCheckout(customerId: string, { last4 = '1881' }: { last4?: string } = {}) {
    const paymentMethod = {
      id: stripeId('pm'),
      object: 'payment_method',
      type: 'card',
      customer: null,
      billing_details: { name: 'Card Holder', email: null, phone: null, address: null },
      card: { brand: 'visa', last4, exp_month: 12, exp_year: 2034, country: 'GB' },
    };
    const setupIntent = {
      id: stripeId('seti'),
      object: 'setup_intent',
      status: 'succeeded',
      payment_method: paymentMethod.id,
      metadata: { customer_id: customerId },
    };
    stripeMocker.paymentMethods.push(paymentMethod);
    stripeMocker.setupIntents.push(setupIntent);
    return {
      paymentMethod,
      session: {
        id: stripeId('cs'),
        object: 'checkout.session',
        mode: 'setup',
        status: 'complete',
        payment_status: 'no_payment_required',
        created: now(),
        livemode: false,
        customer: null,
        customer_email: 'buyer@example.com',
        setup_intent: setupIntent.id,
        subscription: null,
        payment_intent: null,
        metadata: {},
      },
    };
  }

  /**
   * An invoice paid for less than the 500 price, as after a discount, so a test can tell which of
   * the two Ghost records.
   */
  function invoiceFor(
    subscription: { id: string; customer: string },
    { amountPaid = 375 }: { amountPaid?: number } = {},
  ) {
    return {
      id: stripeId('in'),
      object: 'invoice',
      customer: subscription.customer,
      subscription: subscription.id,
      paid: true,
      status: 'paid',
      billing_reason: 'subscription_cycle',
      amount_due: amountPaid,
      amount_paid: amountPaid,
      currency: 'usd',
    };
  }

  /** A Stripe event, serialized as Stripe sends it, so the same event can be delivered again. */
  function eventOf(
    type: string,
    object: object,
    { apiVersion = StripeAPI.API_VERSION }: { apiVersion?: string } = {},
  ) {
    return JSON.stringify({
      id: stripeId('evt'),
      object: 'event',
      type,
      api_version: apiVersion,
      created: now(),
      data: { object },
    });
  }

  /**
   * Delivers a serialized event to the webhook, signed at the time of delivery as Stripe signs
   * each attempt, and returns the HTTP status Ghost responded with. It's signed with the site's
   * webhook secret unless another `secret` is given.
   */
  async function deliver(
    payload: string,
    { secret = process.env.WEBHOOK_SECRET ?? '' }: { secret?: string } = {},
  ): Promise<number> {
    const { statusCode } = await membersAgent
      .post('/webhooks/stripe/')
      .body(payload)
      .header('content-type', 'application/json')
      .header('stripe-signature', signer.generateTestHeaderString({ payload, secret }));
    return statusCode;
  }

  /** Sends a new signed Stripe event to the webhook and returns the HTTP status Ghost responded with. */
  async function send(type: string, object: object) {
    return await deliver(eventOf(type, object));
  }

  /**
   * Everything the webhook can write: every row of every table, and every object Stripe holds. A
   * test that pins "nothing written" compares it before and after, so a changed row counts as a
   * write as much as a new one.
   */
  async function everythingWritten() {
    const rows: Record<string, unknown[]> = {};
    for (const [table, columns] of Object.entries(tables)) {
      rows[table] = await db
        .knex(table)
        .select('*')
        .orderBy(Object.keys(columns as object)[0]);
    }
    const {
      customers,
      subscriptions,
      paymentMethods,
      setupIntents,
      coupons,
      prices,
      products,
      checkoutSessions,
    } = stripeMocker;
    return {
      rows,
      stripe: structuredClone({
        customers,
        subscriptions,
        paymentMethods,
        setupIntents,
        coupons,
        prices,
        products,
        checkoutSessions,
      }),
    };
  }

  /**
   * Delivers a Stripe event, `attempts` times when Ghost fails it, and pins every outcome of each
   * delivery: the status, what Ghost wrote, and the spans it recorded.
   */
  async function pinOutcome({ type, object, apiVersion, secret }: Delivery, outcome: Outcome) {
    const payload = eventOf(type, object, { apiVersion });
    const attempts = outcome.attempts ?? 1;
    const before = outcome.writes === 'nothing' ? await everythingWritten() : null;
    const earlierWebhookSpans = spansOf(metrics, 'stripe.webhook').length;
    const earlierCheckoutSpans = spansOf(metrics, 'stripe_checkout.complete').length;

    for (let attempt = 1; attempt <= attempts; attempt++) {
      assert.equal(await deliver(payload, { secret }), outcome.status, `attempt ${attempt}`);
      if (outcome.writes === 'nothing') {
        assert.deepEqual(await everythingWritten(), before, `attempt ${attempt} wrote something`);
      } else {
        await outcome.writes(attempt);
      }
    }

    assert.deepEqual(
      spansOf(metrics, 'stripe.webhook').slice(earlierWebhookSpans),
      Array(attempts).fill(outcome.webhook),
    );
    assert.deepEqual(
      spansOf(metrics, 'stripe_checkout.complete').slice(earlierCheckoutSpans),
      outcome.checkout ? Array(attempts).fill(outcome.checkout) : [],
    );
  }

  /** Pins each case, all of which write nothing. */
  function itWritesNothing(cases: NothingWritten[]) {
    // Named with `%s`, as Vitest quotes and shortens a name it reads from an object with `$name`.
    it.each(cases.map((testCase) => [testCase.name, testCase] as const))(
      '%s, and writes nothing',
      async (_name, { event, name: _caseName, ...outcome }) => {
        await pinOutcome(await event(), { ...outcome, writes: 'nothing' });
      },
    );
  }

  /**
   * A paid member, created by a completed checkout, whose Stripe customer and subscription Stripe
   * holds.
   */
  async function paidMember() {
    const bought = stripeCustomer();
    assert.equal(await send('checkout.session.completed', subscriptionCheckout(bought)), 200);
    // The checkout starts the buyer's signup email without waiting for it, and the new member's
    // events run after it commits. Wait for both, while this test's mocks still catch them.
    await DomainEvents.allSettled();
    await mockManager.assert.sentEmailEventually({
      to: bought.customer.email,
      subject: /Thank you for signing up/,
    });
    return bought;
  }

  async function memberByEmail(email: string) {
    return await models.Member.findOne({ email }, { withRelated: ['stripeCustomers'] });
  }

  async function linkedSubscription(subscriptionId: string) {
    return await db
      .knex('members_stripe_customers_subscriptions')
      .where({ subscription_id: subscriptionId })
      .first();
  }

  async function paymentsOf(
    customerId: string,
  ): Promise<{ id: string; amount: number; currency: string }[]> {
    const { member_id: memberId } = await db
      .knex('members_stripe_customers')
      .where({ customer_id: customerId })
      .first();
    return await db.knex('members_payment_events').where({ member_id: memberId });
  }

  /** The amount and currency of each payment event recorded for the customer since `before`. */
  async function paymentsAddedSince(customerId: string, before: { id: string }[]) {
    return (await paymentsOf(customerId))
      .filter(({ id }) => !before.some((payment) => payment.id === id))
      .map(({ amount, currency }) => ({ amount, currency }));
  }

  async function donationsRecorded(): Promise<{ id: string; amount: number; currency: string }[]> {
    return await db.knex('donation_payment_events').select('id', 'amount', 'currency');
  }

  /** The amount and currency of each donation recorded since `before`. */
  async function donationsAddedSince(before: { id: string }[]) {
    return (await donationsRecorded())
      .filter(({ id }) => !before.some((donation) => donation.id === id))
      .map(({ amount, currency }) => ({ amount, currency }));
  }

  /**
   * Starts a checkout of the fixture tier through the members API, and returns the Checkout
   * session Ghost created: its id, and its metadata as Stripe sends it back, with every value a
   * string.
   */
  async function startCheckout(body: Record<string, unknown>) {
    const tier = await models.Product.findOne({ type: 'paid' }, { require: true });
    await membersAgent
      .post('/api/create-stripe-checkout-session/')
      .body({ tierId: tier.id, cadence: 'month', metadata: {}, ...body })
      .expectStatus(200);
    const started = stripeMocker.checkoutSessions[stripeMocker.checkoutSessions.length - 1];
    const metadata: Record<string, string> = Object.fromEntries(
      Object.entries(started.metadata ?? {}).map(([key, value]) => [key, String(value)]),
    );
    return { sessionId: String(started.id), metadata };
  }

  /** Starts a gift checkout through the members API, which Ghost records as a pending gift. */
  async function startGiftCheckout() {
    const { sessionId, metadata } = await startCheckout({
      type: 'gift',
      customerEmail: 'gift-buyer@example.com',
    });
    return { sessionId, giftId: metadata.ghost_gift_id };
  }

  async function giftStatus(giftId: string) {
    return (await models.Gift.findOne({ id: giftId }, { require: true })).get('status');
  }

  /** Puts `customerIds` on the webhook's ignore list until `restoreIgnoreList` runs. */
  function ignoreCustomers(customerIds: string[]) {
    const stripeService = require('../../../core/server/services/stripe');
    stripeService.webhookController.configure({ webhookCustomerIgnoreList: customerIds });
  }

  /** Restores the ignore list the site was configured with. */
  function restoreIgnoreList() {
    const configured = config.get('stripeWebhookCustomerIgnoreList');
    // Read as boot reads it: each ID trimmed, empty ones dropped.
    ignoreCustomers(
      Array.isArray(configured)
        ? configured.map((id: unknown) => String(id).trim()).filter(Boolean)
        : [],
    );
  }

  beforeAll(async function () {
    const agents: Agents = await agentProvider.getAgentsForMembers();
    membersAgent = agents.membersAgent;
    await fixtureManager.init('members');
  });

  beforeEach(function () {
    mockManager.mockMail();
    metrics = mockManager.mockMetrics();
    mockManager.mockStripe();
  });

  afterEach(async function () {
    // Work the webhook leaves running, such as a new member's events, finishes while this test's
    // mocks still catch it.
    await DomainEvents.allSettled();
    mockManager.restore();
  });

  describe('Requests Ghost can’t verify', function () {
    it.each([
      ['without a signature', undefined],
      ['with an empty signature', ''],
    ])(
      'responds with 400 to a request %s, and records nothing',
      async function (_request, signature) {
        const request = membersAgent.post('/webhooks/stripe/').body({ fake: 'data' });
        await (
          signature === undefined ? request : request.header('stripe-signature', signature)
        ).expectStatus(400);

        assert.deepEqual(spansOf(metrics, 'stripe.webhook'), []);
      },
    );

    it('responds with 401 when the signature header is malformed', async function () {
      await membersAgent
        .post('/webhooks/stripe/')
        .body({ fake: 'data' })
        .header('stripe-signature', 'dodgy')
        .expectStatus(401);

      assert.deepEqual(spansOf(metrics, 'stripe.webhook'), [
        span(failedBecause('signature_mismatch', 'site'), 'STRIPE_WEBHOOK_SIGNATURE_MISMATCH'),
      ]);
    });

    itWritesNothing([
      {
        name: 'responds with 401 when the signature does not match the site’s webhook secret',
        event: () => ({
          type: 'checkout.session.completed',
          object: subscriptionCheckout(stripeCustomer()),
          secret: 'whsec_of_another_endpoint',
        }),
        status: 401,
        webhook: span(
          failedBecause('signature_mismatch', 'site'),
          'STRIPE_WEBHOOK_SIGNATURE_MISMATCH',
        ),
        checkout: null,
      },
    ]);

    it('responds with 401 and writes nothing when the site has no webhook secret', async function () {
      // There's no way to remove the secret from a running site but to clear it on the service.
      const stripeService = require('../../../core/server/services/stripe');
      const secret = stripeService.webhookManager.webhookSecret;
      stripeService.webhookManager.webhookSecret = null;
      try {
        await pinOutcome(
          { type: 'customer.subscription.updated', object: subscriptionFor(stripeId('cus')) },
          {
            status: 401,
            writes: 'nothing',
            webhook: span(
              failedBecause('webhook_secret_missing', 'site'),
              'STRIPE_WEBHOOK_SECRET_MISSING',
            ),
            checkout: null,
          },
        );
      } finally {
        stripeService.webhookManager.webhookSecret = secret;
      }
    });
  });

  describe('Events Ghost ignores', function () {
    itWritesNothing([
      {
        name: 'responds with 200 to an event type it has no handler for',
        event: () => ({ type: 'product.created', object: { id: stripeId('prod') } }),
        status: 200,
        webhook: span({
          type: 'product.created',
          kind: 'ignored',
          result: 'ignored',
          reason: 'unhandled_type',
        }),
        checkout: null,
      },
    ]);

    it('responds with 200 and writes nothing for a subscription update for a member’s customer on the ignore list, and records it as ignored', async function () {
      const { customer } = await paidMember();
      ignoreCustomers([customer.id]);
      try {
        await pinOutcome(
          { type: 'customer.subscription.updated', object: addSubscription(customer) },
          {
            status: 200,
            writes: 'nothing',
            webhook: span({
              type: 'customer.subscription.updated',
              kind: 'subscription',
              result: 'ignored',
              reason: 'listed_customer',
            }),
            checkout: null,
          },
        );
      } finally {
        restoreIgnoreList();
      }
    });

    it('still ends the subscription of a customer on the ignore list when Stripe deletes it, as only updates are ignored', async function () {
      const bought = await paidMember();
      ignoreCustomers([bought.customer.id]);
      try {
        Object.assign(bought.subscription, { status: 'canceled', canceled_at: now() });

        await pinOutcome(
          { type: 'customer.subscription.deleted', object: bought.subscription },
          {
            status: 200,
            writes: async () => {
              assert.equal((await memberByEmail(bought.customer.email)).get('status'), 'free');
            },
            webhook: span({
              type: 'customer.subscription.deleted',
              kind: 'subscription',
              result: 'handled',
            }),
            checkout: null,
          },
        );
      } finally {
        restoreIgnoreList();
      }
    });
  });

  describe('checkout.session.completed', function () {
    const completed = 'checkout.session.completed';

    it('creates a paid member for the buyer and sends them the signup email', async function () {
      const bought = stripeCustomer();

      await pinOutcome(
        { type: completed, object: subscriptionCheckout(bought) },
        {
          status: 200,
          writes: async () => {
            // The webhook starts the signup email without waiting for it. Wait for it before
            // anything else can fail the test, while this test's mail mock still catches it.
            await DomainEvents.allSettled();
            await mockManager.assert.sentEmailEventually({
              to: bought.customer.email,
              subject: /Thank you for signing up/,
            });
            assert.equal((await memberByEmail(bought.customer.email)).get('status'), 'paid');
            assert.equal((await linkedSubscription(bought.subscription.id)).status, 'active');
          },
          webhook: span({ type: completed, kind: 'subscription_checkout', result: 'handled' }),
          checkout: checkoutSpan({ type: 'subscription', member: 'new' }),
        },
      );
    });

    itWritesNothing([
      {
        name: 'responds with 500 on every attempt when the checkout’s metadata has newsletters this site doesn’t have, as a checkout another site created before sites recorded their checkouts does',
        event: () => ({
          type: completed,
          object: subscriptionCheckout(stripeCustomer(), {
            newsletters: JSON.stringify([{ id: 'a00000000000000000000001' }]),
          }),
        }),
        attempts: 2,
        status: 500,
        webhook: span(
          {
            type: completed,
            kind: 'subscription_checkout',
            ...failedBecause('unclassified', 'ghost'),
          },
          '_OTHER',
        ),
        checkout: checkoutSpan(
          { type: 'subscription', member: 'new', ...failedBecause('unclassified', 'ghost') },
          '_OTHER',
        ),
      },
      {
        name: 'responds with 422 when the buyer’s email is invalid',
        event: () => ({
          type: completed,
          object: subscriptionCheckout(stripeCustomer({ email: 'not an email@example' })),
        }),
        status: 422,
        webhook: span(
          {
            type: completed,
            kind: 'subscription_checkout',
            ...failedBecause('unclassified', 'ghost'),
          },
          'ValidationError',
        ),
        checkout: checkoutSpan(
          { type: 'subscription', member: 'new', ...failedBecause('unclassified', 'ghost') },
          'ValidationError',
        ),
      },
      {
        name: 'responds with 429 when Stripe returns a lock timeout for the customer',
        event: () => {
          const bought = stripeCustomer();
          stripeFails(STRIPE.locked, { resource: 'customers', id: bought.customer.id });
          return { type: completed, object: subscriptionCheckout(bought) };
        },
        status: 429,
        webhook: span(
          {
            type: completed,
            kind: 'subscription_checkout',
            ...failedBecause('stripe_unavailable', 'dependency'),
          },
          'lock_timeout',
        ),
        checkout: checkoutSpan(
          { type: 'subscription', ...failedBecause('stripe_unavailable', 'dependency') },
          'lock_timeout',
        ),
      },
      {
        name: 'responds with 401 when the publisher has revoked Ghost’s access to their Stripe account',
        event: () => {
          const object = subscriptionCheckout(stripeCustomer());
          stripeFails(STRIPE.accessRevoked);
          return { type: completed, object };
        },
        status: 401,
        webhook: span(
          {
            type: completed,
            kind: 'subscription_checkout',
            ...failedBecause('stripe_access_revoked', 'site'),
          },
          'platform_api_key_expired',
        ),
        checkout: checkoutSpan(
          { type: 'subscription', ...failedBecause('stripe_access_revoked', 'site') },
          'platform_api_key_expired',
        ),
      },
      {
        name: 'responds with 500 when Ghost cannot reach Stripe',
        event: () => {
          const object = subscriptionCheckout(stripeCustomer());
          stripeFails(Object.assign(new Error('socket hang up'), { code: 'ECONNRESET' }));
          return { type: completed, object };
        },
        status: 500,
        webhook: span(
          {
            type: completed,
            kind: 'subscription_checkout',
            ...failedBecause('stripe_unavailable', 'dependency'),
          },
          'StripeConnectionError',
        ),
        checkout: checkoutSpan(
          { type: 'subscription', ...failedBecause('stripe_unavailable', 'dependency') },
          'StripeConnectionError',
        ),
      },
      {
        name: 'responds with 200 to a payment checkout that is neither a gift nor a donation, such as a Payment Link sale',
        event: () => ({ type: completed, object: paymentCheckout() }),
        status: 200,
        webhook: span({
          type: completed,
          kind: 'ignored',
          result: 'ignored',
          reason: 'not_a_ghost_checkout',
        }),
        checkout: null,
      },
      {
        name: 'responds with 200 to a checkout marked as both a gift and a donation',
        event: () => ({
          type: completed,
          object: paymentCheckout({ metadata: { ghost_donation: 'true', ghost_gift: 'true' } }),
        }),
        status: 200,
        webhook: span({
          type: completed,
          kind: 'ignored',
          result: 'ignored',
          reason: 'conflicting_checkout_markers',
        }),
        checkout: null,
      },
      {
        name: 'responds with 200 to a card update when no member has the Stripe customer',
        event: () => ({ type: completed, object: cardUpdateCheckout(stripeId('cus')).session }),
        status: 200,
        webhook: span({ type: completed, kind: 'card_update_checkout', result: 'handled' }),
        checkout: checkoutSpan({ type: 'setup' }),
      },
      {
        name: 'responds with 200 and leaves a gift purchase pending when its payment hasn’t arrived yet',
        event: async () => {
          const { sessionId, giftId } = await startGiftCheckout();
          return {
            type: completed,
            object: paymentCheckout({
              id: sessionId,
              metadata: { ghost_gift_id: giftId },
              amount: 500,
              paymentStatus: 'unpaid',
            }),
          };
        },
        status: 200,
        webhook: span({
          type: completed,
          kind: 'ignored',
          result: 'ignored',
          reason: 'gift_not_paid',
        }),
        checkout: null,
      },
    ]);

    it('responds with 500 on every attempt when the checkout’s metadata has an offer this site doesn’t have, as a checkout another site created before sites recorded their checkouts can, and leaves a free member with a Stripe customer but no subscription', async function () {
      const bought = stripeCustomer();
      let memberId: string | undefined;

      await pinOutcome(
        {
          type: completed,
          object: subscriptionCheckout(bought, { offer: 'a00000000000000000000002' }),
        },
        {
          attempts: 2,
          status: 500,
          writes: async () => {
            const member = await memberByEmail(bought.customer.email);
            assert.equal(member.get('status'), 'free');
            assert.deepEqual(
              member
                .related('stripeCustomers')
                .toJSON()
                .map(({ customer_id }: { customer_id: string }) => customer_id),
              [bought.customer.id],
            );
            assert.equal(await linkedSubscription(bought.subscription.id), undefined);
            memberId ??= member.id;
            assert.equal(member.id, memberId);
          },
          webhook: span(
            {
              type: completed,
              kind: 'subscription_checkout',
              ...failedBecause('unclassified', 'ghost'),
            },
            'ER_NO_REFERENCED_ROW_2',
          ),
          checkout: checkoutSpan(
            { type: 'subscription', member: 'new', ...failedBecause('unclassified', 'ghost') },
            'ER_NO_REFERENCED_ROW_2',
          ),
        },
      );
    });

    it('completes the checkout with the buyer’s names shortened to fit when they’re longer than Ghost stores', async function () {
      const bought = stripeCustomer({ name: LONG_NAME });

      await pinOutcome(
        { type: completed, object: subscriptionCheckout(bought, { name: LONG_NAME }) },
        {
          status: 200,
          writes: async () => {
            const member = await memberByEmail(bought.customer.email);
            assert.equal(member.get('status'), 'paid');
            assert.equal(member.get('name'), FITTED_NAME);
            assert.deepEqual(
              member
                .related('stripeCustomers')
                .toJSON()
                .map(({ customer_id, name }: { customer_id: string; name: string }) => ({
                  customer_id,
                  name,
                })),
              [{ customer_id: bought.customer.id, name: FITTED_NAME }],
            );
            assert.equal((await linkedSubscription(bought.subscription.id)).status, 'active');
          },
          webhook: span({ type: completed, kind: 'subscription_checkout', result: 'handled' }),
          checkout: checkoutSpan({ type: 'subscription', member: 'new' }),
        },
      );
    });

    it('gives a signed-in member without a name the cardholder’s name, shortened to fit, when they upgrade', async function () {
      const email = `${stripeId('member')}@example.com`;
      const membersService = require('../../../core/server/services/members');
      await membersService.api.members.create({ email });
      // Signed up before the checkout started, which Ghost compares to the second.
      await db
        .knex('members')
        .where({ email })
        .update({ created_at: new Date(Date.now() - 60 * 1000) });
      const bought = stripeCustomer({ email, name: LONG_NAME, cardholder: LONG_NAME });

      await pinOutcome(
        {
          type: completed,
          object: subscriptionCheckout(bought, {
            checkoutType: 'upgrade',
            ghostSignupContext: 'already_authenticated',
          }),
        },
        {
          status: 200,
          writes: async () => {
            const member = await memberByEmail(email);
            assert.equal(member.get('status'), 'paid');
            assert.equal(member.get('name'), FITTED_NAME);
            assert.equal(member.related('stripeCustomers').first().get('name'), FITTED_NAME);
            assert.equal((await linkedSubscription(bought.subscription.id)).status, 'active');
          },
          webhook: span({ type: completed, kind: 'subscription_checkout', result: 'handled' }),
          checkout: checkoutSpan({ type: 'subscription', member: 'signed_in' }),
        },
      );
    });

    it('saves the new card on Stripe and on each of the member’s subscriptions when a member updates their card', async function () {
      const { customer, subscription } = await paidMember();
      const second = addSubscription(customer);
      assert.equal(await send('customer.subscription.updated', second), 200);
      const { paymentMethod, session } = cardUpdateCheckout(customer.id, { last4: '1881' });

      await pinOutcome(
        { type: completed, object: session },
        {
          status: 200,
          writes: async () => {
            assert.equal(paymentMethod.customer, customer.id);
            for (const { id } of [subscription, second]) {
              const onStripe = stripeMocker.subscriptions.find(
                (held: { id: string }) => held.id === id,
              );
              assert.equal(onStripe.default_payment_method, paymentMethod.id);
              assert.equal((await linkedSubscription(id)).default_payment_card_last4, '1881');
            }
          },
          webhook: span({ type: completed, kind: 'card_update_checkout', result: 'handled' }),
          checkout: checkoutSpan({ type: 'setup' }),
        },
      );
    });

    it('records a donation under the donor’s name, shortened to fit, when it’s longer than Ghost stores', async function () {
      const email = `${stripeId('donor')}@example.com`;

      await pinOutcome(
        {
          type: completed,
          object: paymentCheckout({ metadata: { ghost_donation: 'true' }, email, name: LONG_NAME }),
        },
        {
          status: 200,
          writes: async () => {
            const donation = await db.knex('donation_payment_events').where({ email }).first();
            assert.equal(donation.name, FITTED_NAME);
          },
          webhook: span({ type: completed, kind: 'donation_checkout', result: 'handled' }),
          checkout: checkoutSpan({ type: 'donation' }),
        },
      );
    });

    it.each(['paid', 'unpaid'] as const)(
      'records a donation, with its amount, when its payment is %s',
      async (paymentStatus) => {
        const before = await donationsRecorded();

        await pinOutcome(
          {
            type: completed,
            object: paymentCheckout({ metadata: { ghost_donation: 'true' }, paymentStatus }),
          },
          {
            status: 200,
            writes: async () => {
              assert.deepEqual(await donationsAddedSince(before), [
                { amount: 1200, currency: 'usd' },
              ]);
            },
            webhook: span({ type: completed, kind: 'donation_checkout', result: 'handled' }),
            checkout: checkoutSpan({ type: 'donation' }),
          },
        );
      },
    );
  });

  describe('Gift purchases, whenever their payment arrives', function () {
    it.each(['checkout.session.completed', 'checkout.session.async_payment_succeeded'])(
      'records a paid gift purchase as purchased on %s',
      async (type) => {
        const { sessionId, giftId } = await startGiftCheckout();

        await pinOutcome(
          {
            type,
            object: paymentCheckout({
              id: sessionId,
              metadata: { ghost_gift_id: giftId },
              amount: 500,
            }),
          },
          {
            status: 200,
            writes: async () => {
              assert.equal(await giftStatus(giftId), 'purchased');
            },
            webhook: span({ type, kind: 'gift_checkout', result: 'handled' }),
            checkout: checkoutSpan({ type: 'gift' }),
          },
        );
      },
    );
  });

  describe('checkout.session.async_payment_succeeded and async_payment_failed', function () {
    itWritesNothing([
      {
        name: 'responds with 200 when a donation’s delayed payment succeeds',
        event: () => ({
          type: 'checkout.session.async_payment_succeeded',
          object: paymentCheckout({ metadata: { ghost_donation: 'true' } }),
        }),
        status: 200,
        webhook: span({
          type: 'checkout.session.async_payment_succeeded',
          kind: 'ignored',
          result: 'ignored',
          reason: 'not_a_gift',
        }),
        checkout: null,
      },
      {
        name: 'responds with 200 and leaves the gift pending when a delayed payment fails',
        event: async () => {
          const { sessionId, giftId } = await startGiftCheckout();
          return {
            type: 'checkout.session.async_payment_failed',
            object: paymentCheckout({
              id: sessionId,
              metadata: { ghost_gift_id: giftId },
              paymentStatus: 'unpaid',
            }),
          };
        },
        status: 200,
        webhook: span({
          type: 'checkout.session.async_payment_failed',
          kind: 'ignored',
          result: 'ignored',
          reason: 'payment_failed',
        }),
        checkout: null,
      },
    ]);
  });

  describe('Sites sharing a Stripe account', function () {
    // Stripe sends each event on an account to every webhook endpoint on it, so each site on a
    // shared account receives the other sites' checkouts too.
    const completed = 'checkout.session.completed';
    const anotherSite = { ghost_site_uuid: crypto.randomUUID() };

    /** An event about a checkout another site created, which this site ignores. */
    function anotherSitesCheckout(
      name: string,
      type: string,
      object: () => object,
    ): NothingWritten {
      return {
        name,
        event: () => ({ type, object: object() }),
        status: 200,
        webhook: span({ type, kind: 'ignored', result: 'ignored', reason: 'another_site' }),
        checkout: null,
      };
    }

    itWritesNothing([
      anotherSitesCheckout(
        'responds with 200 to a signup on another site, with newsletters this site doesn’t have',
        completed,
        () =>
          subscriptionCheckout(stripeCustomer(), {
            ...anotherSite,
            newsletters: JSON.stringify([{ id: 'a00000000000000000000001' }]),
          }),
      ),
      anotherSitesCheckout('responds with 200 to a donation to another site', completed, () =>
        paymentCheckout({ metadata: { ...anotherSite, ghost_donation: 'true' } }),
      ),
      anotherSitesCheckout('responds with 200 to a card update on another site', completed, () => ({
        ...cardUpdateCheckout(stripeId('cus')).session,
        metadata: anotherSite,
      })),
      anotherSitesCheckout(
        'responds with 200 when the delayed payment for a gift on another site arrives',
        'checkout.session.async_payment_succeeded',
        () =>
          paymentCheckout({
            metadata: { ...anotherSite, ghost_gift_id: 'a00000000000000000000003' },
          }),
      ),
    ]);

    it('creates a paid member from a signup checkout this site created', async function () {
      const bought = stripeCustomer();
      const { metadata } = await startCheckout({ customerEmail: bought.customer.email });

      await pinOutcome(
        { type: completed, object: subscriptionCheckout(bought, metadata) },
        {
          status: 200,
          writes: async () => {
            await DomainEvents.allSettled();
            await mockManager.assert.sentEmailEventually({
              to: bought.customer.email,
              subject: /Thank you for signing up/,
            });
            assert.equal((await memberByEmail(bought.customer.email)).get('status'), 'paid');
          },
          webhook: span({ type: completed, kind: 'subscription_checkout', result: 'handled' }),
          checkout: checkoutSpan({ type: 'subscription', member: 'new' }),
        },
      );
    });

    it('completes a checkout whose buyer sent another site’s uuid in its metadata', async function () {
      const bought = stripeCustomer();
      const { metadata } = await startCheckout({
        customerEmail: bought.customer.email,
        metadata: anotherSite,
      });

      await pinOutcome(
        { type: completed, object: subscriptionCheckout(bought, metadata) },
        {
          status: 200,
          writes: async () => {
            await DomainEvents.allSettled();
            await mockManager.assert.sentEmailEventually({
              to: bought.customer.email,
              subject: /Thank you for signing up/,
            });
            assert.equal((await memberByEmail(bought.customer.email)).get('status'), 'paid');
          },
          webhook: span({ type: completed, kind: 'subscription_checkout', result: 'handled' }),
          checkout: checkoutSpan({ type: 'subscription', member: 'new' }),
        },
      );
    });

    it('records a donation from a donation checkout this site created', async function () {
      const before = await donationsRecorded();
      const { sessionId, metadata } = await startCheckout({
        type: 'donation',
        customerEmail: 'donor@example.com',
      });

      await pinOutcome(
        { type: completed, object: paymentCheckout({ id: sessionId, metadata }) },
        {
          status: 200,
          writes: async () => {
            assert.deepEqual(await donationsAddedSince(before), [
              { amount: 1200, currency: 'usd' },
            ]);
          },
          webhook: span({ type: completed, kind: 'donation_checkout', result: 'handled' }),
          checkout: checkoutSpan({ type: 'donation' }),
        },
      );
    });
  });

  describe('customer.subscription.updated', function () {
    const updated = 'customer.subscription.updated';

    itWritesNothing([
      {
        name: 'responds with 200 when no member has the subscription’s Stripe customer',
        event: () => ({ type: updated, object: subscriptionFor(stripeId('cus')) }),
        status: 200,
        webhook: span({ type: updated, kind: 'subscription', result: 'handled' }),
        checkout: null,
      },
      {
        name: 'responds with 400 on every attempt when the subscription’s Stripe coupon isn’t a valid offer',
        event: async () => {
          const { customer } = await paidMember();
          const coupon = {
            id: stripeId('coupon'),
            object: 'coupon',
            amount_off: null,
            currency: 'usd',
            duration: 'forever',
            duration_in_months: null,
            name: '12.5% off',
            percent_off: 12.5,
            valid: true,
          };
          stripeMocker.coupons.push(coupon);
          const discount = {
            id: stripeId('di'),
            object: 'discount',
            coupon,
            customer: customer.id,
            start: now(),
          };
          return { type: updated, object: addSubscription(customer, { discount }) };
        },
        attempts: 2,
        status: 400,
        webhook: span(
          { type: updated, kind: 'subscription', ...failedBecause('unclassified', 'ghost') },
          'ValidationError',
        ),
        checkout: null,
      },
      {
        name: 'responds with 400 on every attempt to a subscription with more than one price, such as one created in the Stripe dashboard',
        event: async () => {
          const { customer } = await paidMember();
          const prices = [
            priceFor(FIXTURE_PRODUCT, 'price_a'),
            priceFor(FIXTURE_PRODUCT, 'price_b'),
          ];
          return { type: updated, object: addSubscription(customer, { prices }) };
        },
        attempts: 2,
        status: 400,
        webhook: span(
          {
            type: updated,
            kind: 'subscription',
            ...failedBecause('unsupported_subscription', 'site'),
          },
          'STRIPE_WEBHOOK_UNSUPPORTED_SUBSCRIPTION',
        ),
        checkout: null,
      },
    ]);
  });

  describe('invoice.payment_succeeded', function () {
    const paid = 'invoice.payment_succeeded';

    it.each([
      ['Ghost’s', undefined],
      ['a different', '2099-01-01'],
    ])(
      'records the amount paid for a member’s invoice sent at %s Stripe API version',
      async (_version, apiVersion) => {
        const { customer, subscription } = await paidMember();
        const before = await paymentsOf(customer.id);

        await pinOutcome(
          { type: paid, object: invoiceFor(subscription), apiVersion },
          {
            status: 200,
            writes: async () => {
              assert.deepEqual(await paymentsAddedSince(customer.id, before), [
                { amount: 375, currency: 'usd' },
              ]);
            },
            webhook: span({ type: paid, kind: 'invoice', result: 'handled' }),
            checkout: null,
          },
        );
      },
    );

    it('responds with 200 and records no payment for a $0 invoice, such as the start of a trial', async function () {
      const { customer, subscription } = await paidMember();
      const before = await paymentsOf(customer.id);

      await pinOutcome(
        { type: paid, object: invoiceFor(subscription, { amountPaid: 0 }) },
        {
          status: 200,
          writes: async () => {
            assert.deepEqual(await paymentsAddedSince(customer.id, before), []);
          },
          webhook: span({ type: paid, kind: 'invoice', result: 'handled' }),
          checkout: null,
        },
      );
    });

    itWritesNothing([
      {
        name: 'responds with 200 to an invoice without a subscription, such as a donation’s invoice',
        event: () => ({
          type: paid,
          object: { ...invoiceFor({ id: '', customer: stripeId('cus') }), subscription: null },
        }),
        status: 200,
        webhook: span({ type: paid, kind: 'invoice', result: 'handled' }),
        checkout: null,
      },
      {
        name: 'responds with 200 to an invoice for a product that is not one of the site’s tiers',
        event: () => ({
          type: paid,
          object: invoiceFor(
            subscriptionFor(stripeId('cus'), { prices: [priceFor('prod_of_another_site')] }),
          ),
        }),
        status: 200,
        webhook: span({ type: paid, kind: 'invoice', result: 'handled' }),
        checkout: null,
      },
      {
        name: 'responds with 200 to an invoice whose subscription has more than one price',
        event: () => ({
          type: paid,
          object: invoiceFor(
            subscriptionFor(stripeId('cus'), {
              prices: [priceFor(FIXTURE_PRODUCT, 'price_a'), priceFor(FIXTURE_PRODUCT, 'price_b')],
            }),
          ),
        }),
        status: 200,
        webhook: span({ type: paid, kind: 'invoice', result: 'handled' }),
        checkout: null,
      },
      {
        name: 'responds with 404 on every attempt to an invoice for one of the site’s tiers when no member has the Stripe customer',
        event: () => ({ type: paid, object: invoiceFor(subscriptionFor(stripeId('cus'))) }),
        attempts: 2,
        status: 404,
        webhook: span(
          { type: paid, kind: 'invoice', ...failedBecause('no_member_for_customer', 'site') },
          'STRIPE_WEBHOOK_NO_MEMBER_FOR_CUSTOMER',
        ),
        checkout: null,
      },
      {
        name: 'responds with 401 when the publisher has revoked Ghost’s access to their Stripe account',
        event: async () => {
          const { subscription } = await paidMember();
          stripeFails(STRIPE.accessRevoked);
          return { type: paid, object: invoiceFor(subscription) };
        },
        status: 401,
        webhook: span(
          { type: paid, kind: 'invoice', ...failedBecause('stripe_access_revoked', 'site') },
          'platform_api_key_expired',
        ),
        checkout: null,
      },
    ]);
  });

  describe('charge.refunded', function () {
    it('records a gift as refunded when its payment is refunded', async function () {
      const { sessionId, giftId } = await startGiftCheckout();
      const bought = paymentCheckout({
        id: sessionId,
        metadata: { ghost_gift_id: giftId },
        amount: 500,
      });
      assert.equal(await send('checkout.session.completed', bought), 200);

      await pinOutcome(
        {
          type: 'charge.refunded',
          object: {
            id: stripeId('ch'),
            object: 'charge',
            payment_intent: bought.payment_intent,
            invoice: null,
            refunded: true,
          },
        },
        {
          status: 200,
          writes: async () => {
            assert.equal(await giftStatus(giftId), 'refunded');
          },
          webhook: span({ type: 'charge.refunded', kind: 'refund', result: 'handled' }),
          checkout: null,
        },
      );
    });

    itWritesNothing([
      {
        name: 'responds with 200 to a refund that is not for a gift',
        event: () => ({
          type: 'charge.refunded',
          object: {
            id: stripeId('ch'),
            object: 'charge',
            payment_intent: stripeId('pi'),
            invoice: null,
            refunded: true,
          },
        }),
        status: 200,
        webhook: span({ type: 'charge.refunded', kind: 'refund', result: 'handled' }),
        checkout: null,
      },
    ]);
  });
});
