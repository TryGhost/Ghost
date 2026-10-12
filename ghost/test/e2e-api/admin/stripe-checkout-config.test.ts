import assert from 'node:assert/strict';

const {
  agentProvider,
  dbUtils,
  fixtureManager,
  mockManager,
} = require('../../utils/e2e-framework');
const models = require('../../../core/server/models');

describe('Stripe Checkout Config Admin API', function () {
  let agent: {
    get: (_url: string) => any;
    put: (_url: string) => any;
    loginAsOwner: () => Promise<void>;
    loginAsEditor: () => Promise<void>;
    loginAsContributor: () => Promise<void>;
    useZapierAdminAPIKey: () => Promise<void>;
  };

  const DASHBOARD_DESIGN = { design: { customize: false } };

  async function setCheckout(config: Record<string, unknown>, status = 200) {
    const { body } = await agent
      .put('stripe/checkout/config/')
      .body({ checkout_config: [config] })
      .expectStatus(status);
    return body;
  }

  async function readCheckout() {
    const { body } = await agent.get('stripe/checkout/config/').expectStatus(200);
    return body.checkout_config[0];
  }

  const design = (over: Record<string, unknown> = {}) => ({
    design: {
      customize: true,
      button_color: '#FF5A1F',
      background_color: '#ffffff',
      border_style: 'pill',
      font_family: 'roboto_slab',
      ...over,
    },
  });

  beforeAll(async function () {
    agent = await agentProvider.getAdminAPIAgent();
    await fixtureManager.init('users');
    await agent.loginAsOwner();
  });

  beforeEach(function () {
    mockManager.mockLabsEnabled('stripeCheckoutDesign');
    // Shipping has its own tests, so these see the design alone.
    mockManager.mockLabsDisabled('stripeCheckoutCollection');
  });

  afterEach(async function () {
    mockManager.restore();
    await models.Base.knex('stripe_checkout_config').del();
    await models.Base.knex('actions').where('resource_type', 'stripe_checkout_config').del();
  });

  it('is not found while its flag is off', async function () {
    mockManager.mockLabsDisabled('stripeCheckoutDesign');

    await agent.get('stripe/checkout/config/').expectStatus(404);
    await agent
      .put('stripe/checkout/config/')
      .body({ checkout_config: [design()] })
      .expectStatus(404);
  });

  it('starts with the design from the Stripe dashboard', async function () {
    assert.deepEqual(await readCheckout(), DASHBOARD_DESIGN);
  });

  it('accepts exactly what it reads back, including on a site that never set a design', async function () {
    const unset = await readCheckout();
    await setCheckout(unset);
    assert.deepEqual(await readCheckout(), unset);

    await setCheckout(design());
    const set = await readCheckout();
    await setCheckout(set);
    assert.deepEqual(await readCheckout(), set);
  });

  describe('The design', function () {
    it('keeps a design and reads it back', async function () {
      await setCheckout(design());

      assert.deepEqual(await readCheckout(), {
        design: {
          customize: true,
          // Saved lowercase.
          button_color: '#ff5a1f',
          background_color: '#ffffff',
          border_style: 'pill',
          font_family: 'roboto_slab',
        },
      });
    });

    it('goes back to the Stripe dashboard design', async function () {
      await setCheckout(design());

      await setCheckout(DASHBOARD_DESIGN);

      assert.deepEqual(await readCheckout(), DASHBOARD_DESIGN);
    });

    it('refuses part of a design', async function () {
      await setCheckout(design({ font_family: undefined }), 422);
    });

    it('refuses a color that is not a hex code', async function () {
      const body = await setCheckout(design({ button_color: 'orange' }), 422);
      assert.match(body.errors[0].context, /6-digit hex code/);
    });

    it('refuses a font or corner style Stripe does not offer', async function () {
      const font = await setCheckout(design({ font_family: 'Comic Sans' }), 422);
      assert.match(font.errors[0].context, /font Stripe Checkout offers/);

      const corners = await setCheckout(design({ border_style: 'scalloped' }), 422);
      assert.match(corners.errors[0].context, /rounded, rectangular or pill/);
    });

    it('reads a stored design that can no longer be read as none, and saves over it', async function () {
      await setCheckout(design());
      await models.Base.knex('stripe_checkout_config').update({
        design: JSON.stringify({
          button_color: '#ff5a1f',
          background_color: '#ffffff',
          border_style: 'pill',
          font_family: 'a_font_stripe_dropped',
        }),
      });

      assert.deepEqual(await readCheckout(), DASHBOARD_DESIGN);

      await setCheckout(design({ font_family: 'lora' }));
      assert.equal((await readCheckout()).design.font_family, 'lora');
    });
  });

  describe('History', function () {
    it('records a staff user saving the design', async function () {
      const { body: me } = await agent.get('users/me/').expectStatus(200);

      await setCheckout(design());

      const { body } = await agent
        .get('actions/?filter=resource_type:stripe_checkout_config&include=actor,resource')
        .expectStatus(200);
      assert.equal(body.actions.length, 1);
      const [action] = body.actions;
      assert.equal(action.event, 'edited');
      assert.equal(action.actor_type, 'user');
      assert.equal(action.actor.id, me.users[0].id);
      assert.equal(action.resource.slug, 'default');
      assert.deepEqual(JSON.parse(action.context), { primary_name: 'Stripe Checkout' });
    });
  });

  describe('Permissions', function () {
    const body = { checkout_config: [design()] };

    // Each sign-in counts towards the login attempt limit, so clear it before signing the
    // owner back in.
    afterEach(async function () {
      await dbUtils.truncate('brute');
      await agent.loginAsOwner();
    });

    it('lets an editor read the design but not change it', async function () {
      await agent.loginAsEditor();

      await agent.get('stripe/checkout/config/').expectStatus(200);
      await agent.put('stripe/checkout/config/').body(body).expectStatus(403);
    });

    it('keeps a contributor out', async function () {
      await agent.loginAsContributor();

      await agent.get('stripe/checkout/config/').expectStatus(403);
      await agent.put('stripe/checkout/config/').body(body).expectStatus(403);
    });

    // Integration API keys may only call allowlisted endpoints, and this isn't one.
    it('keeps integrations out', async function () {
      await agent.useZapierAdminAPIKey();

      await agent.get('stripe/checkout/config/').expectStatus(403);
      await agent.put('stripe/checkout/config/').body(body).expectStatus(403);
    });
  });
});
