import assert from 'node:assert/strict';
import type * as Framework from '../../utils/e2e-framework';

// Required rather than imported, so the test shares the module instances Ghost boots with.
const { agentProvider, fixtureManager, mockManager } = require('../../utils/e2e-framework');
const models = require('../../../core/server/models');

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
