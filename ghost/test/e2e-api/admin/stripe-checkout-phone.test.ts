import assert from 'node:assert/strict';

const {
  agentProvider,
  fixtureManager,
  mockManager,
  hostLimits,
} = require('../../utils/e2e-framework');
const models = require('../../../core/server/models');

describe('Stripe Checkout phone number collection', function () {
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

  const NO_PHONE = { collect: false };

  async function readCheckout() {
    const { body } = await agent.get('stripe/checkout/config/').expectStatus(200);
    return body.checkout_config[0];
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

  // While the host switches custom fields off, every field reads as archived, so the phone
  // keeps its field as it does while that field is archived, and no other field can be chosen.
  describe('while the host switches custom fields off', function () {
    afterEach(async function () {
      await hostLimits.restoreHostLimits();
    });

    it('keeps its field and saves it back, but takes no newly chosen one', async function () {
      await createField('Mobile', 'short_text');
      await setCheckout(phone());
      await hostLimits.setHostLimits({ limitCustomFields: { disabled: true } });

      const saved = await readCheckout();
      assert.deepEqual(saved.phone, phone().phone);
      await setCheckout(saved);

      const refused = await refusal(phone({ custom_field_key: 'mobile' }));
      assert.equal(refused.property, 'phone.custom_field_key');
    });
  });
});
