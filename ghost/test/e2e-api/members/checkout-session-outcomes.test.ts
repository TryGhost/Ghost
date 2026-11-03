import assert from 'node:assert/strict';
import { z } from 'zod';
import type * as Framework from '../../utils/e2e-framework';

// Loaded with `require` rather than `import`, because under Vitest an `import` of a CommonJS
// module gets a separate copy of it. With `require`, the test shares the module instances Ghost
// boots with, so the mock manager's stubs reach Ghost and its `restore` removes them.
const { agentProvider, fixtureManager, mockManager } = require('../../utils/e2e-framework');
const models = require('../../../core/server/models');
const stripeService = require('../../../core/server/services/stripe');
const logging = require('@tryghost/logging');
const sinon = require('sinon');

type Agents = Awaited<ReturnType<typeof Framework.agentProvider.getAgentsForMembers>>;

interface MockedMetrics {
  tracked: (_name: string) => Record<string, unknown>[];
}

describe('Checkout session outcomes', function () {
  const { stripeMocker } = mockManager;
  let adminAgent: Agents['adminAgent'];
  let membersAgent: Agents['membersAgent'];
  let metrics: MockedMetrics;
  let paidTierId: string;

  const design = {
    button_color: '#ff5a1f',
    background_color: '#ffffff',
    border_style: 'pill',
    font_family: 'roboto_slab',
  };

  async function setDesign() {
    await adminAgent
      .put('/stripe/checkout/config/')
      .body({ checkout_config: [{ design: { customize: true, ...design } }] })
      .expectStatus(200);
  }

  // The tax ID is the one thing a checkout can ask the buyer for without a custom field to save
  // the answer in, because Stripe keeps the tax ID itself, so it's the simplest part to set up.
  async function offerTaxId() {
    mockManager.mockLabsEnabled('stripeCheckoutCollection');
    mockManager.mockLabsDisabled('stripeAutomaticTax');
    await adminAgent
      .put('/stripe/checkout/config/')
      .body({ checkout_config: [{ tax_number: { collect: true } }] })
      .expectStatus(200);
  }

  function startCheckout(status = 200) {
    return membersAgent
      .post('/api/create-stripe-checkout-session/')
      .body({ tierId: paidTierId, cadence: 'month' })
      .expectStatus(status);
  }

  const sessions = () => metrics.tracked('stripe_checkout.session');
  const checkouts = () => metrics.tracked('stripe_checkout.start');

  beforeAll(async function () {
    const agents = await agentProvider.getAgentsForMembers();
    adminAgent = agents.adminAgent;
    membersAgent = agents.membersAgent;
    await fixtureManager.init('members');
    await adminAgent.loginAsOwner();

    const { body } = await adminAgent.get('/tiers/').expectStatus(200);
    paidTierId = body.tiers.find((tier: { type: string }) => tier.type === 'paid').id;
  });

  beforeEach(function () {
    mockManager.mockStripe();
    mockManager.mockLabsEnabled('stripeCheckoutDesign');
    metrics = mockManager.mockMetrics();
  });

  afterEach(async function () {
    mockManager.restore();
    await models.Base.knex('stripe_checkout_config_tiers').del();
    await models.Base.knex('stripe_checkout_config').del();
  });

  it('records each checkout a buyer starts, beside its session', async function () {
    await startCheckout();

    expect(checkouts()).toMatchObject([
      { event: { outcome: 'success' }, labels: { type: 'subscription' } },
    ]);
    assert.equal(sessions().length, 1);
  });

  it('records the kind of each checkout a buyer starts', async function () {
    for (const body of [
      { type: 'donation', customerEmail: 'donor@example.com', metadata: {} },
      {
        type: 'gift',
        tierId: paidTierId,
        cadence: 'month',
        customerEmail: 'gift-buyer@example.com',
        metadata: {},
      },
    ]) {
      await membersAgent.post('/api/create-stripe-checkout-session/').body(body).expectStatus(200);
    }

    expect(checkouts()).toMatchObject([
      { event: { outcome: 'success' }, labels: { type: 'donation' } },
      { event: { outcome: 'success' }, labels: { type: 'gift' } },
    ]);
  });

  it('records a checkout Ghost refused under its refusal, with no session', async function () {
    await membersAgent
      .post('/api/create-stripe-checkout-session/')
      .body({ tierId: '0123456789abcdef01234567', cadence: 'month' })
      .expectStatus(400);

    expect(checkouts()).toMatchObject([
      {
        event: { outcome: 'failure' },
        error: { type: 'BadRequestError' },
        labels: { type: 'subscription' },
      },
    ]);
    assert.deepEqual(sessions(), []);
  });

  it('records a checkout Ghost refused for a kind it doesn’t offer, with no kind', async function () {
    await membersAgent
      .post('/api/create-stripe-checkout-session/')
      .body({ type: 'layaway', tierId: paidTierId, cadence: 'month' })
      .expectStatus(400);

    expect(checkouts()).toEqual([
      expect.objectContaining({ error: { type: 'BadRequestError' }, labels: {} }),
    ]);
    assert.deepEqual(sessions(), []);
  });

  it('records a checkout Stripe failed under Stripe’s error, as its session does', async function () {
    stripeMocker.checkoutSessionError = { type: 'api_error', message: 'Stripe is down' };
    await startCheckout(400);

    for (const outcomes of [checkouts(), sessions()]) {
      expect(outcomes).toMatchObject([
        { event: { outcome: 'failure' }, error: { type: 'StripeAPIError' } },
      ]);
    }
  });

  it('records a session created without a design', async function () {
    await startCheckout();

    expect(sessions()).toMatchObject([
      { event: { outcome: 'success' }, labels: { design: 'none' } },
    ]);
  });

  it('records a session created in the publisher design', async function () {
    await setDesign();
    await startCheckout();

    expect(sessions()).toMatchObject([
      { event: { outcome: 'success' }, labels: { design: 'applied' } },
    ]);
  });

  it('records a session that went ahead in Stripe’s design when Stripe refused the publisher’s', async function () {
    await setDesign();
    stripeMocker.refuseCheckoutDesign = true;
    await startCheckout();

    assert.equal(stripeMocker.checkoutSessions.at(-1).branding_settings, undefined);
    expect(sessions()).toMatchObject([
      { event: { outcome: 'success' }, labels: { design: 'refused' } },
    ]);
  });

  it('records each part of the checkout a session was sent with', async function () {
    await offerTaxId();
    await startCheckout();

    expect(sessions()).toMatchObject([
      {
        event: { outcome: 'success' },
        labels: { design: 'none', shipping: 'none', phone: 'none', tax_number: 'applied' },
      },
    ]);
  });

  it('records a collected part Stripe refused by name, as the session went ahead without it', async function () {
    await offerTaxId();
    stripeMocker.checkoutParamRefusal = {
      param: 'tax_id_collection',
      error: {
        type: 'invalid_request_error',
        param: 'tax_id_collection[enabled]',
        message: 'Tax ID collection is not available.',
      },
    };
    await startCheckout();

    assert.equal(stripeMocker.checkoutSessions.at(-1).tax_id_collection, undefined);
    expect(sessions()).toMatchObject([
      { event: { outcome: 'success' }, labels: { tax_number: 'refused' } },
    ]);
  });

  it('records every part as dropped when Stripe refused the session without naming why, and it went ahead without them', async function () {
    await setDesign();
    await offerTaxId();
    stripeMocker.checkoutParamRefusal = {
      param: 'tax_id_collection',
      error: { type: 'invalid_request_error', message: 'Tax ID collection needs more.' },
    };
    await startCheckout();

    const session = stripeMocker.checkoutSessions.at(-1);
    assert.equal(session.tax_id_collection, undefined);
    assert.equal(session.branding_settings, undefined);
    expect(sessions()).toMatchObject([
      { event: { outcome: 'success' }, labels: { design: 'dropped', tax_number: 'dropped' } },
    ]);
  });

  it('records a session Stripe failed without naming why, even sent without the checkout’s parts', async function () {
    await setDesign();
    stripeMocker.checkoutSessionError = {
      type: 'invalid_request_error',
      message: 'Your account cannot currently make live charges.',
    };
    await startCheckout(400);

    expect(sessions()).toMatchObject([
      { event: { outcome: 'failure' }, labels: { design: 'dropped' } },
    ]);
  });

  it('records a session Stripe failed with its error’s code, never its message', async function () {
    await setDesign();
    stripeMocker.checkoutSessionError = {
      type: 'invalid_request_error',
      code: 'email_invalid',
      param: 'customer_email',
      message: 'Invalid email address: member@example',
    };
    await startCheckout(400);

    expect(sessions()).toMatchObject([
      { event: { outcome: 'failure' }, labels: { design: 'applied' } },
    ]);
    assert.deepEqual(
      sessions().map((session) => session.error),
      [{ type: 'email_invalid' }],
    );
  });

  it('logs a failed session’s exception once for each span it fails, with Stripe’s message as the line and that span’s ids', async function () {
    const reason = 'Your account cannot currently make live charges.';
    const errors = sinon.stub(logging, 'error');
    stripeMocker.checkoutSessionError = { type: 'invalid_request_error', message: reason };
    await startCheckout(400);

    // `logging.error` is called either with the error itself or with an object of fields that
    // holds the error under `err`. Matching both finds every line logged about Stripe's refusal,
    // so the assertion below also shows that no other code logs the refusal.
    const CarriesReason = z.union([
      z.object({ message: z.literal(reason) }),
      z.object({ err: z.object({ message: z.literal(reason) }) }),
    ]);
    const lines = errors.args.filter(
      ([first]: unknown[]) => CarriesReason.safeParse(first).success,
    );
    const [session] = sessions();
    const [checkout] = checkouts();
    // The tracer logs each exception without a message, so Ghost's logger uses the error's
    // message, here Stripe's reason, as the line's message.
    expect(lines).toMatchObject([
      [
        {
          event: { name: 'stripe_checkout.session.exception' },
          trace: session.trace,
          span: session.span,
          error: { type: 'StripeInvalidRequestError' },
          labels: { design: 'none' },
        },
      ],
      [
        {
          event: { name: 'stripe_checkout.start.exception' },
          trace: checkout.trace,
          span: checkout.span,
          error: { type: 'StripeInvalidRequestError' },
        },
      ],
    ]);
  });

  it('records nothing for a preview, which is not a buyer’s session', async function () {
    await adminAgent
      .post('/stripe/checkout/preview/')
      .body({ checkout_preview: [{ tier_id: paidTierId, design: { customize: true, ...design } }] })
      .expectStatus(200);

    assert.deepEqual(sessions(), []);
  });

  it('records nothing for reading the Stripe dashboard’s branding, which is not a buyer’s session', async function () {
    await adminAgent.get('/stripe/checkout/branding/').expectStatus(200);

    assert.equal(stripeMocker.checkoutSessions.length, 1);
    assert.deepEqual(sessions(), []);
  });

  describe('on a site not connected to Stripe', function () {
    beforeEach(async function () {
      await mockManager.disableStripe();
    });

    afterEach(async function () {
      await stripeService.init();
    });

    it('answers a checkout that failed before reaching Stripe as a server error, recording and logging it under the error that stopped it', async function () {
      const errors = sinon.stub(logging, 'error');
      await startCheckout(500);

      expect(checkouts()).toMatchObject([
        { event: { outcome: 'failure' }, error: { type: 'TypeError' } },
      ]);
      assert.deepEqual(sessions(), []);
      const Exception = z.object({
        event: z.object({ name: z.literal('stripe_checkout.start.exception') }),
      });
      const lines = errors.args.filter(([first]: unknown[]) => Exception.safeParse(first).success);
      expect(lines).toMatchObject([[{ error: { type: 'TypeError' } }]]);
    });
  });
});
