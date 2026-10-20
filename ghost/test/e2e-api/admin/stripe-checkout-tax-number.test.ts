import assert from 'node:assert/strict';

const { agentProvider, fixtureManager, mockManager } = require('../../utils/e2e-framework');
const models = require('../../../core/server/models');

// Paid tiers inserted rather than created through the API, so no Stripe product is made for
// them. The cleanup names the same ids.
const SECOND_TIER_ID = 'ffffffffffffffffffffffff';
const THIRD_TIER_ID = 'fffffffffffffffffffffffe';

describe('Stripe Checkout tax number collection', function () {
  let agent: {
    get: (_url: string) => any;
    put: (_url: string) => any;
    post: (_url: string) => any;
    loginAsOwner: () => Promise<void>;
  };
  let paidTierId: string;
  let freeTierId: string;

  async function setCheckout(config: Record<string, unknown>, status = 200) {
    const { body } = await agent
      .put('stripe/checkout/config/')
      .body({ checkout_config: [config] })
      .expectStatus(status);
    return body;
  }

  const NO_TAX_NUMBER = { collect: false };

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

  const taxNumber = (over: Record<string, unknown> = {}) => ({
    tax_number: { collect: true, ...over },
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

  beforeEach(function () {
    mockManager.mockLabsEnabled('stripeCheckoutCollection');
    mockManager.mockLabsEnabled('membersCustomFields');
  });

  afterEach(async function () {
    mockManager.restore();
    await models.Base.knex('stripe_checkout_config_tiers').del();
    await models.Base.knex('stripe_checkout_config').del();
    await models.Base.knex('members_metafield_bindings').del();
    await models.Base.knex('members_metafields').del();
    await models.Base.knex('actions').where('resource_type', 'stripe_checkout_config').del();
    await models.Base.knex('products').whereIn('id', [SECOND_TIER_ID, THIRD_TIER_ID]).del();
  });

  it('starts with no tax number collected', async function () {
    assert.deepEqual((await readCheckout()).tax_number, NO_TAX_NUMBER);
  });

  it('saves the switch alone, with no custom field, and reads it back as saved', async function () {
    await setCheckout(taxNumber());

    const saved = await readCheckout();
    assert.deepEqual(saved.tax_number, { collect: true });

    await setCheckout(saved);
    assert.deepEqual(await readCheckout(), saved);
  });

  it('refuses a custom field, as Stripe keeps the tax number and Ghost saves nothing', async function () {
    await agent
      .post('members/metafields/custom/')
      .body({ members_metafields: [{ name: 'VAT number', type: 'short_text' }] })
      .expectStatus(201);

    assert.equal(
      (await refusal(taxNumber({ custom_field_key: 'vat_number' }))).property,
      'tax_number',
    );
    assert.deepEqual((await readCheckout()).tax_number, NO_TAX_NUMBER);
  });

  it('covers every paid tier unless it names some', async function () {
    await addPaidTier(SECOND_TIER_ID);

    await setCheckout(taxNumber({ tier_ids: [SECOND_TIER_ID, paidTierId, SECOND_TIER_ID] }));
    assert.deepEqual(
      [...(await readCheckout()).tax_number.tier_ids].sort(),
      [paidTierId, SECOND_TIER_ID].sort(),
    );

    await setCheckout(taxNumber());
    assert.equal((await readCheckout()).tax_number.tier_ids, undefined);
  });

  it('keeps its tiers apart from the tiers the phone number names', async function () {
    await addPaidTier(SECOND_TIER_ID);
    await addPaidTier(THIRD_TIER_ID);
    await agent
      .post('members/metafields/custom/')
      .body({ members_metafields: [{ name: 'Contact phone', type: 'short_text' }] })
      .expectStatus(201);

    await setCheckout({
      ...taxNumber({ tier_ids: [SECOND_TIER_ID] }),
      phone: {
        collect: true,
        tier_ids: [THIRD_TIER_ID, paidTierId],
        custom_field_key: 'contact_phone',
      },
    });

    const saved = await readCheckout();
    assert.deepEqual(saved.tax_number.tier_ids, [SECOND_TIER_ID]);
    assert.deepEqual([...saved.phone.tier_ids].sort(), [paidTierId, THIRD_TIER_ID].sort());

    // Switching the phone number off leaves the tax number's tiers alone.
    await setCheckout({ phone: { collect: false } });
    assert.deepEqual((await readCheckout()).tax_number.tier_ids, [SECOND_TIER_ID]);
  });

  it('refuses tiers that have no checkout to ask at', async function () {
    assert.deepEqual(await refusal(taxNumber({ tier_ids: [freeTierId] })), {
      property: 'tax_number.tier_ids',
      message: 'Only paid tiers have a checkout to collect a tax ID at.',
    });
    assert.deepEqual(await refusal(taxNumber({ tier_ids: [SECOND_TIER_ID] })), {
      property: 'tax_number.tier_ids',
      message: `Unknown tier: ${SECOND_TIER_ID}`,
    });
    assert.equal((await refusal(taxNumber({ tier_ids: [] }))).property, 'tax_number.tier_ids');
    assert.deepEqual((await readCheckout()).tax_number, NO_TAX_NUMBER);
  });

  it('forgets its tiers once switched off, so switching back on starts afresh', async function () {
    await addPaidTier(SECOND_TIER_ID);
    await setCheckout(taxNumber({ tier_ids: [SECOND_TIER_ID] }));

    await setCheckout({ tax_number: NO_TAX_NUMBER });
    assert.deepEqual((await readCheckout()).tax_number, NO_TAX_NUMBER);

    await setCheckout(taxNumber());
    assert.deepEqual((await readCheckout()).tax_number, { collect: true });
  });

  it('leaves the other parts alone, and saving them leaves the tax number alone', async function () {
    const design = {
      customize: true,
      button_color: '#ff5a1f',
      background_color: '#ffffff',
      border_style: 'pill',
      font_family: 'roboto_slab',
    };
    await setCheckout({ design });
    await setCheckout(taxNumber());

    const saved = await readCheckout();
    assert.deepEqual(saved.design, design);
    assert.deepEqual(saved.phone, { collect: false });
    assert.deepEqual(
      (await setCheckout({ design })).checkout_config[0].tax_number,
      taxNumber().tax_number,
    );
  });

  it('switches off when the last tier it named is deleted', async function () {
    await addPaidTier(SECOND_TIER_ID);
    await setCheckout(taxNumber({ tier_ids: [SECOND_TIER_ID] }));

    // Never widens to every tier.
    await models.Base.knex('products').where('id', SECOND_TIER_ID).del();
    assert.deepEqual((await readCheckout()).tax_number, NO_TAX_NUMBER);
  });

  it('leaves the tax number out, and refuses it, while its flag is off', async function () {
    mockManager.mockLabsDisabled('stripeCheckoutCollection');

    assert.equal((await readCheckout()).tax_number, undefined);
    assert.deepEqual(await refusal(taxNumber()), {
      property: 'tax_number',
      message: 'Tax ID collection is not available yet.',
    });
  });
});
