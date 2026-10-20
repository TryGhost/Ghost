import assert from 'node:assert/strict';

const { agentProvider, fixtureManager, mockManager } = require('../../utils/e2e-framework');
const models = require('../../../core/server/models');

// Paid tiers inserted rather than created through the API, so no Stripe product is made for
// them. The cleanup names the same ids.
const SECOND_TIER_ID = 'ffffffffffffffffffffffff';
const THIRD_TIER_ID = 'fffffffffffffffffffffffe';

describe('Stripe Checkout phone number collection', function () {
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

  const NO_PHONE = { collect: false };

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

  const phone = (over: Record<string, unknown> = {}) => ({
    phone: { collect: true, custom_field_key: 'contact_phone', ...over },
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
    await createField('Contact phone', 'short_text');
    await createField('Delivery address', 'address');
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

  it('starts with no phone number collected', async function () {
    assert.deepEqual((await readCheckout()).phone, NO_PHONE);
  });

  it('saves where the phone number lands, and reads it back as saved', async function () {
    await setCheckout(phone());

    const saved = await readCheckout();
    assert.deepEqual(saved.phone, { collect: true, custom_field_key: 'contact_phone' });

    await setCheckout(saved);
    assert.deepEqual(await readCheckout(), saved);
  });

  it('covers every paid tier unless it names some', async function () {
    await addPaidTier(SECOND_TIER_ID);

    await setCheckout(phone({ tier_ids: [SECOND_TIER_ID, paidTierId, SECOND_TIER_ID] }));
    assert.deepEqual(
      [...(await readCheckout()).phone.tier_ids].sort(),
      [paidTierId, SECOND_TIER_ID].sort(),
    );

    await setCheckout(phone());
    assert.equal((await readCheckout()).phone.tier_ids, undefined);
  });

  it('keeps its tiers apart from the tiers shipping names', async function () {
    await addPaidTier(SECOND_TIER_ID);
    await addPaidTier(THIRD_TIER_ID);
    await createField('Recipient name', 'short_text');

    await setCheckout({
      ...phone({ tier_ids: [SECOND_TIER_ID] }),
      shipping: {
        collect: true,
        tier_ids: [THIRD_TIER_ID, paidTierId],
        address: { custom_field_key: 'delivery_address' },
        name: { custom_field_key: 'recipient_name' },
      },
    });

    const saved = await readCheckout();
    assert.deepEqual(saved.phone.tier_ids, [SECOND_TIER_ID]);
    assert.deepEqual([...saved.shipping.tier_ids].sort(), [paidTierId, THIRD_TIER_ID].sort());

    // Switching shipping off leaves the phone number's tiers alone.
    await setCheckout({ shipping: { collect: false } });
    assert.deepEqual((await readCheckout()).phone.tier_ids, [SECOND_TIER_ID]);
  });

  it('refuses tiers that have no checkout to ask at', async function () {
    assert.deepEqual(await refusal(phone({ tier_ids: [freeTierId] })), {
      property: 'phone.tier_ids',
      message: 'Only paid tiers have a checkout to collect a phone number at.',
    });
    assert.deepEqual(await refusal(phone({ tier_ids: [SECOND_TIER_ID] })), {
      property: 'phone.tier_ids',
      message: `Unknown tier: ${SECOND_TIER_ID}`,
    });
    assert.equal((await refusal(phone({ tier_ids: [] }))).property, 'phone.tier_ids');
    assert.deepEqual((await readCheckout()).phone, NO_PHONE);
  });

  // A `custom_field_key` names a key among the publisher's own fields, so another namespace's
  // field of that key is not one the settings can choose.
  it('refuses a key that only another namespace has', async function () {
    await models.Base.knex('members_metafields').insert({
      id: '6600000000000000000000c1',
      namespace: 'shop',
      key: 'mobile',
      name: 'Mobile',
      type: 'short_text',
      created_at: new Date(),
    });

    assert.deepEqual(await refusal(phone({ custom_field_key: 'mobile' })), {
      property: 'phone.custom_field_key',
      message: 'Choose a custom field the site already has.',
    });
  });

  it('refuses a custom field that cannot hold a phone number', async function () {
    assert.deepEqual(await refusal(phone({ custom_field_key: 'not_a_field' })), {
      property: 'phone.custom_field_key',
      message: 'Choose a custom field the site already has.',
    });
    // Refused for its spelling before any lookup. MySQL compares keys without regard to
    // case, so a lookup alone would find `contact_phone` and save the binding as typed.
    assert.deepEqual(await refusal(phone({ custom_field_key: 'Contact_Phone' })), {
      property: 'phone.custom_field_key',
      message: 'A key can only contain lowercase letters, numbers and underscores.',
    });
    assert.deepEqual(await refusal(phone({ custom_field_key: 'delivery_address' })), {
      property: 'phone.custom_field_key',
      message: 'Choose a short text custom field for the phone number.',
    });
    assert.equal(
      (await refusal(phone({ custom_field_key: undefined }))).property,
      'phone.custom_field_key',
    );

    await agent
      .put('members/metafields/custom/contact_phone/')
      .body({ members_metafields: [{ status: 'archived' }] })
      .expectStatus(200);
    assert.deepEqual(await refusal(phone()), {
      property: 'phone.custom_field_key',
      message: 'An archived custom field cannot receive collected data. Restore it first.',
    });
    assert.deepEqual((await readCheckout()).phone, NO_PHONE);
  });

  it('refuses a field the recipient name is saved into, as one would overwrite the other', async function () {
    await createField('Recipient name', 'short_text');
    await setCheckout({
      shipping: {
        collect: true,
        address: { custom_field_key: 'delivery_address' },
        name: { custom_field_key: 'recipient_name' },
      },
    });

    assert.deepEqual(await refusal(phone({ custom_field_key: 'recipient_name' })), {
      property: 'phone.custom_field_key',
      message: "That custom field already holds the recipient's name. Choose another.",
    });

    // Switching shipping off in the same save frees the field.
    await setCheckout({
      ...phone({ custom_field_key: 'recipient_name' }),
      shipping: { collect: false },
    });
    assert.equal((await readCheckout()).phone.custom_field_key, 'recipient_name');
  });

  it('forgets the tiers and field once switched off, so switching back on starts afresh', async function () {
    await addPaidTier(SECOND_TIER_ID);
    await setCheckout(phone({ tier_ids: [SECOND_TIER_ID] }));

    await setCheckout({ phone: NO_PHONE });
    assert.deepEqual((await readCheckout()).phone, NO_PHONE);

    await setCheckout(phone());
    assert.deepEqual((await readCheckout()).phone, phone().phone);
  });

  it('leaves the other parts alone, and saving them leaves the phone number alone', async function () {
    const design = {
      customize: true,
      button_color: '#ff5a1f',
      background_color: '#ffffff',
      border_style: 'pill',
      font_family: 'roboto_slab',
    };
    await setCheckout({ design });
    await setCheckout(phone());

    const saved = await readCheckout();
    assert.deepEqual(saved.design, design);
    assert.deepEqual(saved.shipping, { collect: false });
    assert.deepEqual((await setCheckout({ design })).checkout_config[0].phone, phone().phone);
  });

  it('switches off when the last tier it named is deleted', async function () {
    await addPaidTier(SECOND_TIER_ID);
    await setCheckout(phone({ tier_ids: [SECOND_TIER_ID] }));

    // Never widens to every tier.
    await models.Base.knex('products').where('id', SECOND_TIER_ID).del();
    assert.deepEqual((await readCheckout()).phone, NO_PHONE);
  });

  it('keeps its place while the field is archived, and switches off once it is deleted', async function () {
    await setCheckout(phone());

    await agent
      .put('members/metafields/custom/contact_phone/')
      .body({ members_metafields: [{ status: 'archived' }] })
      .expectStatus(200);
    const saved = await readCheckout();
    assert.deepEqual(saved.phone, phone().phone);
    await setCheckout(saved);

    await agent.delete('members/metafields/custom/contact_phone/').expectStatus(204);
    assert.deepEqual((await readCheckout()).phone, NO_PHONE);
  });

  it('leaves the phone number out, and refuses it, while its flag is off', async function () {
    mockManager.mockLabsDisabled('stripeCheckoutCollection');

    assert.equal((await readCheckout()).phone, undefined);
    assert.deepEqual(await refusal(phone()), {
      property: 'phone',
      message: 'Phone number collection is not available yet.',
    });
  });
});
