import assert from 'node:assert/strict';

const { agentProvider, fixtureManager, mockManager } = require('../../utils/e2e-framework');
const models = require('../../../core/server/models');

// Paid tiers inserted rather than created through the API, so no Stripe product is made for
// them. The cleanup names the same ids.
const SECOND_TIER_ID = 'ffffffffffffffffffffffff';
const THIRD_TIER_ID = 'fffffffffffffffffffffffe';

describe('Stripe Checkout shipping address collection', function () {
  let agent: {
    get: (_url: string) => any;
    put: (_url: string) => any;
    post: (_url: string) => any;
    delete: (_url: string) => any;
    loginAsOwner: () => Promise<void>;
  };
  let paidTierId: string;
  let freeTierId: string;

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

  async function addPaidTier(id: string) {
    const [existing] = await models.Base.knex('products').where('id', paidTierId);
    await models.Base.knex('products').insert({
      ...existing,
      id,
      name: `Tier ${id.slice(-4)}`,
      slug: `tier-${id.slice(-4)}`,
    });
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

    const { body } = await agent.get('tiers/?limit=all').expectStatus(200);
    paidTierId = body.tiers.find((tier: { type: string }) => tier.type === 'paid').id;
    freeTierId = body.tiers.find((tier: { type: string }) => tier.type === 'free').id;
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
    await models.Base.knex('products').whereIn('id', [SECOND_TIER_ID, THIRD_TIER_ID]).del();
  });

  it('starts with no shipping address collected', async function () {
    assert.deepEqual(await readCheckout(), {
      design: { customize: false },
      shipping: NO_SHIPPING,
    });
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

  it('covers every paid tier unless it names some', async function () {
    await addPaidTier(SECOND_TIER_ID);

    await setCheckout(shipping({ tier_ids: [SECOND_TIER_ID, paidTierId, SECOND_TIER_ID] }));
    assert.deepEqual(
      [...(await readCheckout()).shipping.tier_ids].sort(),
      [paidTierId, SECOND_TIER_ID].sort(),
    );

    await setCheckout(shipping());
    assert.equal((await readCheckout()).shipping.tier_ids, undefined);
  });

  it('refuses tiers that have no checkout to ask at', async function () {
    assert.deepEqual(await refusal(shipping({ tier_ids: [freeTierId] })), {
      property: 'shipping.tier_ids',
      message: 'Only paid tiers have a checkout to collect a shipping address at.',
    });
    assert.deepEqual(await refusal(shipping({ tier_ids: [SECOND_TIER_ID] })), {
      property: 'shipping.tier_ids',
      message: `Unknown tier: ${SECOND_TIER_ID}`,
    });
    assert.equal((await refusal(shipping({ tier_ids: [] }))).property, 'shipping.tier_ids');
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

  it('forgets the tiers and fields once switched off, so switching back on starts afresh', async function () {
    await addPaidTier(SECOND_TIER_ID);
    await setCheckout(shipping({ tier_ids: [SECOND_TIER_ID], allowed_countries: ['GB'] }));

    await setCheckout({ shipping: NO_SHIPPING });
    assert.deepEqual((await readCheckout()).shipping, NO_SHIPPING);

    await setCheckout(shipping());
    assert.deepEqual((await readCheckout()).shipping, shipping().shipping);
  });

  it('leaves the design alone, and saving the design leaves shipping alone', async function () {
    const design = {
      customize: true,
      button_color: '#ff5a1f',
      background_color: '#ffffff',
      border_style: 'pill',
      font_family: 'roboto_slab',
    };
    await setCheckout({ design });
    await setCheckout(shipping());
    await setCheckout({ design: { customize: false } });

    assert.deepEqual(await readCheckout(), {
      design: { customize: false },
      shipping: shipping().shipping,
    });
    assert.deepEqual(
      (await setCheckout({ design })).checkout_config[0].shipping,
      shipping().shipping,
    );
  });

  it('drops a deleted tier, and switches off when the last tier it named is deleted', async function () {
    await addPaidTier(SECOND_TIER_ID);
    await addPaidTier(THIRD_TIER_ID);
    await setCheckout(shipping({ tier_ids: [SECOND_TIER_ID, THIRD_TIER_ID] }));

    await models.Base.knex('products').where('id', SECOND_TIER_ID).del();
    assert.deepEqual((await readCheckout()).shipping.tier_ids, [THIRD_TIER_ID]);

    // Never widens to every tier.
    await models.Base.knex('products').where('id', THIRD_TIER_ID).del();
    assert.deepEqual((await readCheckout()).shipping, NO_SHIPPING);
  });

  it('only counts the named tiers that are paid', async function () {
    await addPaidTier(SECOND_TIER_ID);
    await setCheckout(shipping({ tier_ids: [SECOND_TIER_ID] }));
    // The API refuses a free tier, so one can only be on the list if it got there another way.
    await models.Base.knex('stripe_checkout_config_tiers').insert({
      section: 'shipping',
      product_id: freeTierId,
    });
    assert.deepEqual((await readCheckout()).shipping.tier_ids, [SECOND_TIER_ID]);

    await models.Base.knex('products').where('id', SECOND_TIER_ID).del();
    assert.deepEqual((await readCheckout()).shipping, NO_SHIPPING);
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

  it('leaves shipping out, and refuses it, while its flag is off', async function () {
    mockManager.mockLabsDisabled('stripeCheckoutCollection');

    assert.deepEqual(await readCheckout(), { design: { customize: false } });
    assert.deepEqual(await refusal(shipping()), {
      property: 'shipping',
      message: 'Shipping address collection is not available yet.',
    });
  });
});
