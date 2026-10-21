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

  async function addCustomFields(fields: Array<{ name: string; type: string }>) {
    mockManager.mockLabsEnabled('membersCustomFields');
    for (const field of fields) {
      await agent
        .post('members/metafields/custom/')
        .body({ members_metafields: [field] })
        .expectStatus(201);
    }
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

  it('marks the checkout as a preview, and has it expire as soon as Stripe allows', async function () {
    const opened = Date.now() / 1000;
    await preview({ tier_id: paidTierId, design: { customize: false } });

    const session = stripeMocker.checkoutSessions.at(-1);
    assert.equal(session.metadata.ghost_checkout_preview, true);
    const lifetime = Number(session.expires_at) - opened;
    assert.ok(lifetime >= 30 * 60 && lifetime < 35 * 60, `expires ${lifetime}s after opening`);
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

  describe('with unsaved shipping', function () {
    beforeEach(async function () {
      mockManager.mockLabsEnabled('stripeCheckoutCollection');
      await addCustomFields([
        { name: 'Delivery address', type: 'address' },
        { name: 'Recipient name', type: 'short_text' },
      ]);
    });

    afterEach(async function () {
      await models.Base.knex('members_metafield_bindings').del();
      await models.Base.knex('members_metafields').del();
    });

    function previewShipping(shipping: Record<string, unknown>, status = 200) {
      return preview({ tier_id: paidTierId, design: { customize: false }, shipping }, status);
    }

    const collect = (over = {}) => ({
      collect: true,
      address: { custom_field_key: 'delivery_address' },
      name: { custom_field_key: 'recipient_name' },
      ...over,
    });

    it('asks for an address in the countries being previewed', async function () {
      await previewShipping(collect({ allowed_countries: ['GB', 'IE'] }));

      const session = stripeMocker.checkoutSessions.at(-1);
      assert.deepEqual(session.shipping_address_collection.allowed_countries, ['GB', 'IE']);
    });

    it('asks for none when it is off', async function () {
      await previewShipping({ collect: false });
      assert.equal(stripeMocker.checkoutSessions.at(-1).shipping_address_collection, undefined);
    });

    it('refuses what saving refuses, and opens no checkout', async function () {
      const { body } = await previewShipping(collect({ tier_ids: [freeTierId] }), 422);
      assert.equal(body.errors[0].property, 'shipping.tier_ids');

      const unpicked = await previewShipping({ collect: true }, 422);
      assert.equal(unpicked.body.errors[0].property, 'shipping.address');
      assert.equal(stripeMocker.checkoutSessions.length, 0);
    });

    it('is refused while the shipping flag is off, as saving it is', async function () {
      mockManager.mockLabsDisabled('stripeCheckoutCollection');
      const { body } = await previewShipping(collect(), 422);

      assert.equal(body.errors[0].property, 'shipping');
      assert.equal(stripeMocker.checkoutSessions.length, 0);
    });
  });

  describe('with an unsaved phone number', function () {
    beforeEach(async function () {
      mockManager.mockLabsEnabled('stripeCheckoutCollection');
      await addCustomFields([{ name: 'Contact phone', type: 'short_text' }]);
    });

    afterEach(async function () {
      await models.Base.knex('members_metafield_bindings').del();
      await models.Base.knex('members_metafields').del();
    });

    function previewPhone(phone?: Record<string, unknown>, status = 200) {
      return preview(
        {
          tier_id: paidTierId,
          design: { customize: false },
          ...(phone ? { phone } : {}),
        },
        status,
      );
    }

    const askedPhone = () => stripeMocker.checkoutSessions.at(-1).phone_number_collection;

    it('asks for a phone number as the settings being edited say', async function () {
      await previewPhone({ collect: true, custom_field_key: 'contact_phone' });
      assert.deepEqual(askedPhone(), { enabled: true });

      await previewPhone({ collect: false });
      assert.equal(askedPhone(), undefined);
    });

    it('refuses what saving refuses', async function () {
      const { body } = await previewPhone(
        { collect: true, custom_field_key: 'contact_phone', tier_ids: [freeTierId] },
        422,
      );
      assert.equal(body.errors[0].property, 'phone.tier_ids');
    });

    it('asks as the saved settings say when the preview leaves it out', async function () {
      await agent
        .put('stripe/checkout/config/')
        .body({
          checkout_config: [{ phone: { collect: true, custom_field_key: 'contact_phone' } }],
        })
        .expectStatus(200);

      await previewPhone();
      assert.deepEqual(askedPhone(), { enabled: true });

      await previewPhone({ collect: false });
      assert.equal(askedPhone(), undefined);
    });
  });

  describe('with an unsaved tax number', function () {
    beforeEach(function () {
      mockManager.mockLabsEnabled('stripeCheckoutCollection');
      // Automatic tax offers a tax ID on every checkout by itself.
      mockManager.mockLabsDisabled('stripeAutomaticTax');
    });

    function previewTaxNumber(taxNumber?: Record<string, unknown>, status = 200) {
      return preview(
        {
          tier_id: paidTierId,
          design: { customize: false },
          ...(taxNumber ? { tax_number: taxNumber } : {}),
        },
        status,
      );
    }

    const offered = () => stripeMocker.checkoutSessions.at(-1).tax_id_collection;

    it('offers a tax ID as the settings being edited say', async function () {
      await previewTaxNumber({ collect: true });
      assert.deepEqual(offered(), { enabled: true });

      await previewTaxNumber({ collect: false });
      assert.equal(offered(), undefined);
    });

    it('refuses what saving refuses', async function () {
      const { body } = await previewTaxNumber({ collect: true, tier_ids: [freeTierId] }, 422);
      assert.equal(body.errors[0].property, 'tax_number.tier_ids');
    });

    it('offers it as the saved settings say when the preview leaves it out', async function () {
      await agent
        .put('stripe/checkout/config/')
        .body({ checkout_config: [{ tax_number: { collect: true } }] })
        .expectStatus(200);

      await previewTaxNumber();
      assert.deepEqual(offered(), { enabled: true });

      await previewTaxNumber({ collect: false });
      assert.equal(offered(), undefined);
    });
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
