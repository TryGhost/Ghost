import assert from 'node:assert/strict';

const {
  agentProvider,
  dbUtils,
  fixtureManager,
  mockManager,
} = require('../../utils/e2e-framework');
const { stripeMocker } = require('../../utils/e2e-framework-mock-manager');
const models = require('../../../core/server/models');

describe('Stripe Checkout Branding Admin API', function () {
  let agent: {
    get: (_url: string) => any;
    put: (_url: string) => any;
    loginAsOwner: () => Promise<void>;
    loginAsEditor: () => Promise<void>;
    loginAsContributor: () => Promise<void>;
    useZapierAdminAPIKey: () => Promise<void>;
  };

  function readBranding(status = 200) {
    return agent.get('stripe/checkout/branding/').expectStatus(status);
  }

  beforeAll(async function () {
    agent = await agentProvider.getAdminAPIAgent();
    await fixtureManager.init('users');
    await agent.loginAsOwner();
  });

  beforeEach(function () {
    mockManager.mockStripe();
    mockManager.mockLabsEnabled('stripeCheckoutDesign');
  });

  afterEach(async function () {
    mockManager.restore();
    await models.Base.knex('stripe_checkout_config').del();
  });

  it('reads the branding from the Stripe dashboard, not the design saved in Ghost', async function () {
    stripeMocker.checkoutBranding = {
      ...stripeMocker.checkoutBranding,
      display_name: 'The Daily Example',
      background_color: '#F4F1EA',
      button_color: '#7c3aed',
      border_style: 'pill',
      font_family: 'lora',
    };
    await agent
      .put('stripe/checkout/config/')
      .body({
        checkout_config: [
          {
            design: {
              customize: true,
              button_color: '#ff5a1f',
              background_color: '#ffffff',
              border_style: 'rectangular',
              font_family: 'roboto_slab',
            },
          },
        ],
      })
      .expectStatus(200);

    const { body } = await readBranding();

    assert.deepEqual(body.checkout_branding, [
      {
        display_name: 'The Daily Example',
        design: {
          button_color: '#7c3aed',
          background_color: '#f4f1ea',
          border_style: 'pill',
          font_family: 'lora',
        },
      },
    ]);
  });

  it('leaves no checkout open in Stripe, and marks the one it used', async function () {
    await readBranding();

    assert.equal(stripeMocker.checkoutSessions.length, 1);
    const [session] = stripeMocker.checkoutSessions;
    assert.equal(session.mode, 'setup');
    assert.equal(session.status, 'expired');
    assert.equal(session.metadata.ghost_checkout_preview, true);
    assert.equal(session.branding_settings, undefined);
  });

  it('still reads the branding when Stripe will not expire the checkout it used', async function () {
    stripeMocker.failCheckoutExpiry = true;

    const { body } = await readBranding();

    assert.equal(body.checkout_branding[0].display_name, 'Stripe Test Account');
  });

  it('keeps the business name when Stripe reports a design Ghost cannot show', async function () {
    stripeMocker.checkoutBranding = {
      ...stripeMocker.checkoutBranding,
      display_name: 'The Daily Example',
      font_family: 'a_font_stripe_added_later',
    };

    const { body } = await readBranding();

    assert.equal(body.checkout_branding[0].display_name, 'The Daily Example');
    assert.equal(body.checkout_branding[0].design, null);
  });

  it('is not found while its flag is off', async function () {
    mockManager.mockLabsDisabled('stripeCheckoutDesign');

    await readBranding(404);
    assert.equal(stripeMocker.checkoutSessions.length, 0);
  });

  describe('Permissions', function () {
    // Each sign-in counts towards the login attempt limit, so clear it before signing the
    // owner back in.
    afterEach(async function () {
      await dbUtils.truncate('brute');
      await agent.loginAsOwner();
    });

    it('lets an editor read it, like the checkout config', async function () {
      await agent.loginAsEditor();
      await readBranding(200);
    });

    it('keeps a contributor out', async function () {
      await agent.loginAsContributor();
      await readBranding(403);
    });

    // Integration API keys may only call allowlisted endpoints, and this isn't one.
    it('keeps integrations out', async function () {
      await agent.useZapierAdminAPIKey();
      await readBranding(403);
    });
  });
});
