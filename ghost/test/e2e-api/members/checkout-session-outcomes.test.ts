import assert from 'node:assert/strict';
import { z } from 'zod';
import type * as Framework from '../../utils/e2e-framework';

// Required rather than imported, so the test shares the module instances Ghost boots with, and
// the mock manager's restore undoes its stubs.
const { agentProvider, fixtureManager, mockManager } = require('../../utils/e2e-framework');
const models = require('../../../core/server/models');
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

  // A tax ID needs no custom field, so it's the collected part that takes no setting up.
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

  // Stripe refuses some sessions without naming a parameter, so any part could be why.
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

  it('logs a failed session’s exception once, with Stripe’s message as the line and the span’s ids', async function () {
    const reason = 'Your account cannot currently make live charges.';
    const errors = sinon.stub(logging, 'error');
    stripeMocker.checkoutSessionError = { type: 'invalid_request_error', message: reason };
    await startCheckout(400);

    // A line carries the reason as its own error, or as the error in its fields.
    const CarriesReason = z.union([
      z.object({ message: z.literal(reason) }),
      z.object({ err: z.object({ message: z.literal(reason) }) }),
    ]);
    const lines = errors.args.filter(
      ([first]: unknown[]) => CarriesReason.safeParse(first).success,
    );
    const [session] = sessions();
    // No message of its own, so Ghost's logger makes the error's message the line.
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
});
