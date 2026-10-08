import assert from 'node:assert/strict';

const {
  agentProvider,
  dbUtils,
  fixtureManager,
  mockManager,
} = require('../../utils/e2e-framework');
const { stripeMocker } = require('../../utils/e2e-framework-mock-manager');
const models = require('../../../core/server/models');

describe('Stripe Checkout Preview Admin API', function () {
  let agent: {
    get: (_url: string) => any;
    post: (_url: string) => any;
    put: (_url: string) => any;
    loginAsOwner: () => Promise<void>;
    loginAsEditor: () => Promise<void>;
    loginAsContributor: () => Promise<void>;
    useZapierAdminAPIKey: () => Promise<void>;
  };
  let paidTierId: string;
  let freeTierId: string;

  const design = {
    button_color: '#ff5a1f',
    background_color: '#ffffff',
    border_style: 'pill',
    font_family: 'roboto_slab',
  };

  function preview(body: Record<string, unknown>, status = 200) {
    return agent
      .post('stripe/checkout/preview/')
      .body({ checkout_preview: [body] })
      .expectStatus(status);
  }

  async function readDesign() {
    const { body } = await agent.get('stripe/checkout/config/').expectStatus(200);
    return body.checkout_config[0].design;
  }

  beforeAll(async function () {
    agent = await agentProvider.getAdminAPIAgent();
    await fixtureManager.init('users', 'members');
    await agent.loginAsOwner();

    const { body } = await agent.get('tiers/').expectStatus(200);
    paidTierId = body.tiers.find((tier: { type: string }) => tier.type === 'paid').id;
    freeTierId = body.tiers.find((tier: { type: string }) => tier.type === 'free').id;
  });

  beforeEach(function () {
    mockManager.mockStripe();
    mockManager.mockLabsEnabled('stripeCheckoutDesign');
  });

  afterEach(async function () {
    mockManager.restore();
    await models.Base.knex('stripe_checkout_config').del();
  });

  it('opens a checkout for a paid tier in the unsaved design, and saves nothing', async function () {
    const { body } = await preview({ tier_id: paidTierId, design: { customize: true, ...design } });

    const session = stripeMocker.checkoutSessions.at(-1);
    assert.equal(body.checkout_preview[0].url, session.url);
    // A subscription checkout, as a signup for the tier would be.
    assert.ok(session.subscription_data);
    assert.deepEqual(session.branding_settings, design);
    assert.deepEqual(await readDesign(), { customize: false });
  });

  it('shows the Stripe dashboard design when not customized, even with a design saved', async function () {
    await agent
      .put('stripe/checkout/config/')
      .body({ checkout_config: [{ design: { customize: true, ...design } }] })
      .expectStatus(200);

    await preview({ tier_id: paidTierId, design: { customize: false } });

    assert.equal(stripeMocker.checkoutSessions.at(-1).branding_settings, undefined);
    assert.equal((await readDesign()).font_family, 'roboto_slab');
  });

  it('refuses a free tier, an unknown tier and a malformed tier id', async function () {
    for (const tierId of [freeTierId, '0123456789abcdef01234567', 'not-a-tier']) {
      const { body } = await preview({ tier_id: tierId, design: { customize: false } }, 422);
      assert.equal(body.errors[0].property, 'tier_id');
    }
    assert.equal(stripeMocker.checkoutSessions.length, 0);
  });

  it('refuses a design Stripe does not offer', async function () {
    const { body } = await preview(
      { tier_id: paidTierId, design: { customize: true, ...design, font_family: 'Comic Sans' } },
      422,
    );
    assert.match(body.errors[0].context, /font Stripe Checkout offers/);
    assert.equal(stripeMocker.checkoutSessions.length, 0);
  });

  it('is not found while its flag is off', async function () {
    mockManager.mockLabsDisabled('stripeCheckoutDesign');

    await preview({ tier_id: paidTierId, design: { customize: false } }, 404);
  });

  describe('Permissions', function () {
    const body = () => ({ tier_id: paidTierId, design: { customize: false } });

    // Each sign-in counts towards the login attempt limit, so clear it before signing the
    // owner back in.
    afterEach(async function () {
      await dbUtils.truncate('brute');
      await agent.loginAsOwner();
    });

    it('keeps editors and contributors out, as they cannot change tiers', async function () {
      await agent.loginAsEditor();
      await preview(body(), 403);

      await agent.loginAsContributor();
      await preview(body(), 403);
    });

    // Integration API keys may only call allowlisted endpoints, and this isn't one.
    it('keeps integrations out', async function () {
      await agent.useZapierAdminAPIKey();
      await preview(body(), 403);
    });
  });
});
