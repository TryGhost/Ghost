import assert from 'node:assert/strict';

const { agentProvider, fixtureManager, mockManager } = require('../../utils/e2e-framework');
const models = require('../../../core/server/models');

describe('Stripe Checkout shipping address collection', function () {
  let agent: {
    get: (_url: string) => any;
    put: (_url: string) => any;
    post: (_url: string) => any;
    delete: (_url: string) => any;
    loginAsOwner: () => Promise<void>;
  };

  async function createField(name: string, type: string) {
    await agent
      .post('members/metafields/custom/')
      .body({ members_metafields: [{ name, type }] })
      .expectStatus(201);
  }

  async function setCheckout(config: Record<string, unknown>, status = 200) {
    const { body } = await agent
      .put('stripe/checkout/config/')
      .body({ checkout_config: [config] })
      .expectStatus(status);
    return body;
  }

  const NO_SHIPPING = { collect: false };

  async function readCheckout() {
    const { body } = await agent.get('stripe/checkout/config/').expectStatus(200);
    return body.checkout_config[0];
  }

  const shipping = (over: Record<string, unknown> = {}) => ({
    shipping: {
      collect: true,
      address: { custom_field_key: 'delivery_address' },
      name: { custom_field_key: 'recipient_name' },
      ...over,
    },
  });

  async function refusal(config: Record<string, unknown>) {
    const body = await setCheckout(config, 422);
    return { property: body.errors[0].property, message: body.errors[0].context };
  }

  beforeAll(async function () {
    agent = await agentProvider.getAdminAPIAgent();
    await fixtureManager.init('users');
    await agent.loginAsOwner();
  });

  beforeEach(async function () {
    mockManager.mockLabsEnabled('stripeCheckoutDesign');
    mockManager.mockLabsEnabled('stripeCheckoutCollection');
    mockManager.mockLabsEnabled('membersCustomFields');
    await createField('Delivery address', 'address');
    await createField('Recipient name', 'short_text');
  });

  afterEach(async function () {
    mockManager.restore();
    await models.Base.knex('stripe_checkout_config_tiers').del();
    await models.Base.knex('stripe_checkout_config').del();
    await models.Base.knex('members_metafield_bindings').del();
    await models.Base.knex('members_metafields').del();
    await models.Base.knex('actions')
      .whereIn('resource_type', ['stripe_checkout_config', 'member_custom_field'])
      .del();
  });

  it('saves where the address and the name land, and reads them back as saved', async function () {
    await setCheckout(shipping({ allowed_countries: ['GB', 'ie', 'GB'] }));

    const saved = await readCheckout();
    assert.deepEqual(saved.shipping, {
      collect: true,
      allowed_countries: ['GB', 'IE'],
      address: { custom_field_key: 'delivery_address' },
      name: { custom_field_key: 'recipient_name' },
    });

    await setCheckout(saved);
    assert.deepEqual(await readCheckout(), saved);
  });

  it('needs a field for the recipient name as well as the address', async function () {
    assert.equal((await refusal(shipping({ name: undefined }))).property, 'shipping.name');
    assert.deepEqual((await readCheckout()).shipping, NO_SHIPPING);
  });

  it('refuses countries Stripe will not ship to, and an empty list', async function () {
    assert.deepEqual(await refusal(shipping({ allowed_countries: ['GB', 'XX'] })), {
      property: 'shipping.allowed_countries.1',
      message: 'Stripe Checkout can only ship to the countries Stripe supports.',
    });
    assert.equal(
      (await refusal(shipping({ allowed_countries: [] }))).property,
      'shipping.allowed_countries',
    );
  });

  it('refuses a custom field that cannot hold what Stripe sends back', async function () {
    assert.deepEqual(await refusal(shipping({ address: { custom_field_key: 'not_a_field' } })), {
      property: 'shipping.address.custom_field_key',
      message: 'Choose a custom field the site already has.',
    });
    assert.deepEqual(await refusal(shipping({ address: { custom_field_key: 'recipient_name' } })), {
      property: 'shipping.address.custom_field_key',
      message: 'Choose an address custom field for the shipping address.',
    });
    assert.equal(
      (await refusal(shipping({ name: { custom_field_key: 'delivery_address' } }))).property,
      'shipping.name.custom_field_key',
    );
    assert.equal((await refusal(shipping({ address: undefined }))).property, 'shipping.address');

    await agent
      .put('members/metafields/custom/delivery_address/')
      .body({ members_metafields: [{ status: 'archived' }] })
      .expectStatus(200);
    assert.deepEqual(await refusal(shipping()), {
      property: 'shipping.address.custom_field_key',
      message: 'An archived custom field cannot receive collected data. Restore it first.',
    });
  });

  it('switches off when either field is deleted', async function () {
    await setCheckout(shipping());

    await agent
      .put('members/metafields/custom/delivery_address/')
      .body({ members_metafields: [{ status: 'archived' }] })
      .expectStatus(200);
    // Archived, the field keeps its place, ready for when it is restored, and what was read
    // can still be saved back.
    const saved = await readCheckout();
    assert.equal(saved.shipping.collect, true);
    await setCheckout(saved);

    await agent.delete('members/metafields/custom/delivery_address/').expectStatus(204);
    assert.deepEqual((await readCheckout()).shipping, NO_SHIPPING);
  });
});
