import assert from 'node:assert/strict';

const { agentProvider, fixtureManager, mockManager } = require('../../utils/e2e-framework');
const models = require('../../../core/server/models');

// A second paid tier, inserted rather than created through the API so no Stripe product
// is made for it. The cleanup has to name the same ids.
const SECOND_TIER_ID = 'ffffffffffffffffffffffff';
const ARCHIVED_TIER_ID = 'fffffffffffffffffffffffe';

describe('Stripe Checkout Config Admin API', function () {
  let agent: {
    get: (_url: string) => any;
    put: (_url: string) => any;
    post: (_url: string) => any;
    delete: (_url: string) => any;
    loginAsOwner: () => Promise<void>;
  };
  let paidTierId: string;
  let freeTierId: string;

  async function createField(field: { name: string; type?: string }) {
    const { body } = await agent
      .post('members/metafields/custom/')
      .body({ members_metafields: [{ type: 'short_text', ...field }] })
      .expectStatus(201);
    return body.members_metafields[0];
  }

  async function setStatus(key: string, status: 'active' | 'archived') {
    await agent
      .put(`members/metafields/custom/${key}/`)
      .body({ members_metafields: [{ status }] })
      .expectStatus(200);
  }

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

  async function createShippingFields() {
    await createField({ name: 'Recipient name', type: 'short_text' });
    await createField({ name: 'Delivery address', type: 'address' });
  }

  async function addPaidTier(id: string, overrides: Record<string, unknown> = {}) {
    const [existing] = await models.Base.knex('products').where('id', paidTierId);
    await models.Base.knex('products').insert({
      ...existing,
      id,
      name: `Tier ${id.slice(-4)}`,
      slug: `tier-${id.slice(-4)}`,
      ...overrides,
    });
  }

  const shipping = (over: Record<string, unknown> = {}) => ({
    shipping: {
      collect: true,
      allowed_countries: ['GB'],
      name: { custom_field_key: 'recipient_name' },
      address: { custom_field_key: 'delivery_address' },
      ...over,
    },
  });

  const bindings = () => models.Base.knex('members_metafield_bindings').select();

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
  });

  afterEach(async function () {
    mockManager.restore();
    await models.Base.knex('stripe_checkout_config_tiers').del();
    await models.Base.knex('stripe_checkout_config').del();
    await models.Base.knex('members_metafield_bindings').del();
    await models.Base.knex('members_metafields').del();
    // The history outlives the fields it describes, which is the point of it — but across
    // tests in one file it would leave each one reading the ones before.
    await models.Base.knex('actions').where('resource_type', 'member_custom_field').del();
    await models.Base.knex('products').whereIn('id', [SECOND_TIER_ID, ARCHIVED_TIER_ID]).del();
  });

  it('starts with nothing collected', async function () {
    assert.deepEqual(await readCheckout(), {});
  });

  describe('Collecting a delivery address', function () {
    // Collecting and choosing where it lands are one statement, because a publisher
    // makes them as one choice: a toggle and the fields beside it.
    it('collects and binds its destinations in one write', async function () {
      await createShippingFields();

      await setCheckout(shipping({ allowed_countries: ['GB', 'ie'] }));

      assert.deepEqual((await readCheckout()).shipping, {
        collect: true,
        // Uppercased on the way in, so one country is one value.
        allowed_countries: ['GB', 'IE'],
        name: { custom_field_key: 'recipient_name' },
        address: { custom_field_key: 'delivery_address' },
      });
    });

    // A country Stripe will not ship to fails the whole session create, so a publisher who
    // saved one would find every checkout broken and nothing to tell them why. Refused at
    // the point they choose it instead.
    it('refuses a country the processor will not ship to', async function () {
      await createShippingFields();

      // The usual slip for GB: two letters, looks like a country, and Stripe rejects it.
      const body = await setCheckout(shipping({ allowed_countries: ['UK'] }), 422);
      assert.match(body.errors[0].context, /will not ship to that country/);

      // Sanctioned, so a general list of countries has it and Stripe does not.
      const sanctioned = await setCheckout(shipping({ allowed_countries: ['KP'] }), 422);
      assert.match(sanctioned.errors[0].context, /will not ship to that country/);
    });

    // Countries are a restriction, so naming none is not an incomplete request — it is a
    // publisher who delivers everywhere. Stored as the absence of a list rather than a
    // copy of every country, because that set moves.
    it('delivers everywhere when the request names no countries', async function () {
      await createShippingFields();

      await setCheckout(shipping({ allowed_countries: undefined }));

      assert.equal(
        'allowed_countries' in (await readCheckout()).shipping,
        false,
        'everywhere reads back as no list, the same way it was written',
      );
    });

    // Naming none and naming an empty list are different statements. A publisher who
    // cleared the list said something, and it was not "deliver worldwide".
    it('refuses an empty list of countries', async function () {
      await createShippingFields();

      const body = await setCheckout(shipping({ allowed_countries: [] }), 422);
      assert.match(body.errors[0].context, /at least one country/);
    });

    it('refuses a country code that is not one', async function () {
      await createShippingFields();

      const body = await setCheckout(shipping({ allowed_countries: ['IRL'] }), 422);
      assert.match(body.errors[0].context, /2-letter country code/);
    });

    // Ghost keeps no convention about where a collected value belongs, so a request that
    // collects without saying where is missing half the decision rather than deferring it.
    it('refuses to collect without saying where the value lands', async function () {
      await createShippingFields();

      const body = await setCheckout({ shipping: { collect: true } }, 422);
      assert.match(body.errors[0].context, /which custom field this is collected into/);

      await setCheckout(shipping({ name: undefined }), 422);
      await setCheckout(shipping({ address: { custom_field_key: '' } }), 422);
      await setCheckout({ phone: { collect: true } }, 422);

      assert.deepEqual(await bindings(), []);
    });

    // Which kinds of thing exist is the request schema's to state, so naming one that
    // does not is a malformed body rather than a lookup that came back empty.
    it('refuses a kind of thing nothing can collect', async function () {
      await setCheckout({ inside_leg: { collect: true, custom_field_key: 'delivery' } }, 422);
    });
  });

  // A publisher picks a field they already keep, so nothing turns up in their custom fields
  // that they did not create themselves.
  describe('Destinations are chosen, never made', function () {
    it('refuses a field the site does not have, and makes nothing', async function () {
      const body = await setCheckout(shipping(), 422);
      assert.match(body.errors[0].context, /custom field the site already has/);
      // Named by where it sits in the request, so a client can show it beside that input.
      assert.equal(body.errors[0].property, 'shipping.name.custom_field_key');

      const phone = await setCheckout({ phone: { collect: true, custom_field_key: 'nope' } }, 422);
      assert.equal(phone.errors[0].property, 'phone.custom_field_key');

      const { body: fields } = await agent.get('members/metafields/custom/').expectStatus(200);
      assert.deepEqual(fields.members_metafields, []);
      assert.deepEqual(await bindings(), []);
    });

    // Binding to it would succeed and collect nothing until someone restored it, which the
    // publisher who asked for the collection has no way to see.
    it('refuses a field the publisher has archived', async function () {
      await createShippingFields();
      await setStatus('delivery_address', 'archived');

      const body = await setCheckout(shipping(), 422);
      assert.match(body.errors[0].context, /archived/);
      assert.equal(body.errors[0].property, 'shipping.address.custom_field_key');
      assert.deepEqual(await bindings(), []);
    });

    // Stripe returns a structured address for the address and plain text for the rest, so
    // a field of the other kind could not hold what arrives.
    it('refuses a field whose type is not what the port supplies', async function () {
      await createField({ name: 'Recipient name', type: 'short_text' });
      await createField({ name: 'Delivery notes', type: 'short_text' });

      const body = await setCheckout(
        shipping({ address: { custom_field_key: 'delivery_notes' } }),
        422,
      );
      assert.match(body.errors[0].context, /address field/);
      assert.equal(body.errors[0].property, 'shipping.address.custom_field_key');
    });

    // A publisher stated one thing, so it either happened or it did not. Every field is
    // checked before anything is written, so a refused request changes nothing.
    it('leaves everything as it was when part of a request is refused', async function () {
      await createShippingFields();
      await setCheckout({ tax_number: { collect: true } });

      await setCheckout(
        {
          ...shipping({ address: { custom_field_key: 'recipient_name' } }),
          tax_number: { collect: false },
        },
        422,
      );

      assert.deepEqual(await bindings(), []);
      assert.deepEqual(await readCheckout(), { tax_number: { collect: true } });
    });

    // A destination is not exclusive: several ports may land in one field, and whichever
    // arrives last is what it holds.
    it('accepts one field for two ports that supply the same kind of value', async function () {
      await createField({ name: 'Contact', type: 'short_text' });
      await createField({ name: 'Delivery address', type: 'address' });

      await setCheckout({
        ...shipping({ name: { custom_field_key: 'contact' } }),
        phone: { collect: true, custom_field_key: 'contact' },
      });

      const config = await readCheckout();
      assert.equal(config.shipping.name.custom_field_key, 'contact');
      assert.equal(config.phone.custom_field_key, 'contact');
    });
  });

  // Each section names the paid tiers it applies to, or none to cover every paid tier.
  describe('Which tiers collect', function () {
    // No list is every paid tier, including ones added later, the same way no countries is
    // everywhere. It reads back as no list, the way it was written.
    it('covers every paid tier when the request names none', async function () {
      await setCheckout({ tax_number: { collect: true } });

      assert.deepEqual(await readCheckout(), { tax_number: { collect: true } });
    });

    it('keeps the tiers a request names, once each', async function () {
      await addPaidTier(SECOND_TIER_ID);

      await setCheckout({
        tax_number: { collect: true, tier_ids: [paidTierId, SECOND_TIER_ID, paidTierId] },
      });

      assert.deepEqual((await readCheckout()).tax_number, {
        collect: true,
        tier_ids: [paidTierId, SECOND_TIER_ID],
      });
    });

    // Narrowing to one tier and widening back to all are each one statement about one
    // section, and nothing about any tier is left behind in between.
    it('moves between every tier and some tiers in one write each way', async function () {
      await createShippingFields();
      await addPaidTier(SECOND_TIER_ID);

      await setCheckout(shipping());
      assert.equal('tier_ids' in (await readCheckout()).shipping, false);

      await setCheckout(shipping({ tier_ids: [SECOND_TIER_ID] }));
      assert.deepEqual((await readCheckout()).shipping.tier_ids, [SECOND_TIER_ID]);

      await setCheckout(shipping());
      assert.equal('tier_ids' in (await readCheckout()).shipping, false);
    });

    // A publisher who cleared the list said something, and it was not "every tier".
    it('refuses an empty list of tiers', async function () {
      const body = await setCheckout({ tax_number: { collect: true, tier_ids: [] } }, 422);
      assert.match(body.errors[0].context, /at least one tier/);
    });

    // A free tier never reaches a checkout, so naming one would look saved and do nothing.
    it('refuses a free tier', async function () {
      const body = await setCheckout(
        { tax_number: { collect: true, tier_ids: [freeTierId] } },
        422,
      );
      assert.match(body.errors[0].context, /Only paid tiers/);
      assert.equal(body.errors[0].property, 'tax_number.tier_ids');
    });

    it('refuses a tier the site does not have', async function () {
      const body = await setCheckout(
        { tax_number: { collect: true, tier_ids: ['6a8dbb6a2668becb3f92f000'] } },
        422,
      );
      assert.match(body.errors[0].context, /Unknown tier/);
    });

    it('refuses something that is not a tier id', async function () {
      await setCheckout({ tax_number: { collect: true, tier_ids: ['gold'] } }, 422);
    });

    // Archiving is reversible, so an archived tier keeps its place for when it returns.
    it('accepts an archived paid tier', async function () {
      await addPaidTier(ARCHIVED_TIER_ID, { active: false });

      await setCheckout({ tax_number: { collect: true, tier_ids: [ARCHIVED_TIER_ID] } });

      assert.deepEqual((await readCheckout()).tax_number.tier_ids, [ARCHIVED_TIER_ID]);
    });
  });

  // A client that edits one thing sends back what it read for the rest, so every read has
  // to be a valid save.
  describe('Reading and saving back', function () {
    it('accepts exactly what it reads back', async function () {
      await createShippingFields();
      await createField({ name: 'Phone number', type: 'short_text' });
      await addPaidTier(SECOND_TIER_ID);
      await setCheckout({
        ...shipping({ tier_ids: [SECOND_TIER_ID] }),
        phone: { collect: true, custom_field_key: 'phone_number' },
        tax_number: { collect: true, tier_ids: [paidTierId] },
        design: {
          customize: true,
          button_color: '#ff5a1f',
          background_color: '#ffffff',
          border_style: 'rounded',
          font_family: 'lora',
        },
      });

      const read = await readCheckout();
      await setCheckout(read);

      assert.deepEqual(await readCheckout(), read);
    });
  });

  describe('Naming one section and not the other', function () {
    // Each section is written on its own, so a client that only knows how to edit one
    // cannot wipe out another by leaving it out.
    it('leaves a section the request does not name alone', async function () {
      await createShippingFields();

      await setCheckout(shipping({ tier_ids: [paidTierId] }));
      await setCheckout({ tax_number: { collect: true } });

      assert.deepEqual(await readCheckout(), {
        ...shipping({ tier_ids: [paidTierId] }),
        tax_number: { collect: true },
      });
    });

    // A tax number is collected and not kept, so nothing is bound for it.
    it('collects a tax number without keeping it anywhere', async function () {
      await setCheckout({ tax_number: { collect: true } });

      assert.deepEqual(await bindings(), []);
    });

    it('names nowhere to keep a tax number', async function () {
      await setCheckout({ tax_number: { collect: true, custom_field_key: 'anything' } }, 422);
    });

    // Turning collection back on is a fresh statement, not a resumption of the last one.
    // Resuming without countries or tiers is everywhere and every tier, and must not
    // quietly inherit the restrictions from before.
    it('does not inherit old countries or tiers when it resumes', async function () {
      await createShippingFields();

      await setCheckout(shipping({ tier_ids: [paidTierId] }));
      await setCheckout({ shipping: { collect: false } });
      assert.deepEqual(await readCheckout(), {});

      await setCheckout(shipping({ allowed_countries: undefined }));

      const config = await readCheckout();
      assert.equal('allowed_countries' in config.shipping, false);
      assert.equal('tier_ids' in config.shipping, false);
    });
  });

  // A binding is the collecting: there is one and the site collects, or there is none and
  // it does not.
  describe('When collection stops', function () {
    it('forgets the bindings rather than keeping them switched off', async function () {
      await createShippingFields();
      await setCheckout(shipping());

      await setCheckout({ shipping: { collect: false } });

      assert.deepEqual(await bindings(), []);
      assert.deepEqual(await readCheckout(), {});
    });

    // The field holds everything collected so far, so it outlives the collecting.
    it('keeps the fields it collected into', async function () {
      await createShippingFields();
      await setCheckout(shipping());

      await setCheckout({ shipping: { collect: false } });

      const { body } = await agent.get('members/metafields/custom/').expectStatus(200);
      assert.deepEqual(body.members_metafields.map((field: { key: string }) => field.key).sort(), [
        'delivery_address',
        'recipient_name',
      ]);
    });
  });

  describe('When a field changes underneath', function () {
    // Deleting takes archiving first, which is the API's own rule; the cascade is the
    // database's. A recipient with nowhere to send the parcel is not a delivery, so the
    // section reads as off.
    it('stops collecting when a destination is deleted', async function () {
      await createShippingFields();
      await setCheckout(shipping());

      await setStatus('delivery_address', 'archived');
      await agent.delete('members/metafields/custom/delivery_address/').expectStatus(204);

      assert.deepEqual(
        (await bindings()).map((row: { port: string }) => row.port),
        ['shipping_name'],
      );
      assert.deepEqual(await readCheckout(), {});
    });

    // Archiving is reversible, so the binding waits rather than being torn out, and the
    // config goes on reporting where the value goes.
    it('keeps reporting a destination that was archived', async function () {
      await createShippingFields();
      await setCheckout(shipping());

      await setStatus('delivery_address', 'archived');

      assert.equal((await readCheckout()).shipping.address.custom_field_key, 'delivery_address');
    });
  });

  // Checkout settings never stop a tier being deleted. Ghost has no way to delete a tier
  // yet; this is what the database does if one is deleted by hand, or once Ghost can.
  describe('When a named tier is deleted', function () {
    it('drops the tier from the sections that named it', async function () {
      await addPaidTier(SECOND_TIER_ID);
      await setCheckout({
        tax_number: { collect: true, tier_ids: [paidTierId, SECOND_TIER_ID] },
      });

      await models.Base.knex('products').where('id', SECOND_TIER_ID).del();

      assert.deepEqual((await readCheckout()).tax_number.tier_ids, [paidTierId]);
    });

    // Limiting a section to some tiers is a choice the publisher made, so losing the last
    // of them must never widen it to every paid tier. Limited to none, it collects nothing,
    // so it reads as off, and what a client reads back can still be saved as it is.
    it('switches a section off when its last tier goes', async function () {
      await createField({ name: 'Phone number', type: 'short_text' });
      await addPaidTier(SECOND_TIER_ID);
      await setCheckout({
        tax_number: { collect: true, tier_ids: [SECOND_TIER_ID] },
        phone: { collect: true, custom_field_key: 'phone_number' },
      });

      await models.Base.knex('products').where('id', SECOND_TIER_ID).del();

      const config = await readCheckout();
      assert.deepEqual(config, { phone: { collect: true, custom_field_key: 'phone_number' } });
      await setCheckout(config);
    });
  });

  describe('The design', function () {
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

    // Every part is Stripe's own vocabulary, so what is saved is what Stripe is sent.
    it('keeps a design and reads it back', async function () {
      await setCheckout(design());

      assert.deepEqual(await readCheckout(), {
        design: {
          customize: true,
          // Lowercased on the way in, so one color is one value.
          button_color: '#ff5a1f',
          background_color: '#ffffff',
          border_style: 'pill',
          font_family: 'roboto_slab',
        },
      });
    });

    // Switching customizing off goes back to the design in the publisher's Stripe
    // dashboard, which is what a site that never set one has.
    it('goes back to the Stripe dashboard design', async function () {
      await setCheckout(design());

      await setCheckout({ design: { customize: false } });

      assert.deepEqual(await readCheckout(), {});
    });

    // A design replaces the dashboard's outright, so half of one is refused rather than
    // mixed with whatever the dashboard says.
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

    // A design saved under rules that have since changed, such as a font Stripe no longer
    // offers, must not lock the publisher out of the rest of their checkout settings. It
    // reads as Stripe's own design until they choose another.
    it('still reads and saves the rest when a stored design can no longer be read', async function () {
      await setCheckout({ ...design(), tax_number: { collect: true } });
      await models.Base.knex('stripe_checkout_config').update({
        design: JSON.stringify({
          button_color: '#ff5a1f',
          background_color: '#ffffff',
          border_style: 'pill',
          font_family: 'a_font_stripe_dropped',
        }),
      });

      assert.deepEqual(await readCheckout(), { tax_number: { collect: true } });
      await setCheckout({ tax_number: { collect: true, tier_ids: [paidTierId] } });
      assert.deepEqual(await readCheckout(), {
        tax_number: { collect: true, tier_ids: [paidTierId] },
      });
    });

    // The design and what the checkout collects are saved through one resource, and
    // neither is touched by a request about the other.
    it('is left alone by a request about collection, and leaves collection alone', async function () {
      await setCheckout(design());
      await setCheckout({ tax_number: { collect: true } });
      await setCheckout(design({ border_style: 'rounded' }));

      const config = await readCheckout();
      assert.deepEqual(config.tax_number, { collect: true });
      assert.equal(config.design.border_style, 'rounded');
    });
  });

  describe('Flag', function () {
    it('cannot be read or configured with the flag off', async function () {
      mockManager.mockLabsDisabled('stripeCheckoutCollection');

      await agent.get('stripe/checkout/config/').expectStatus(404);
      await agent
        .put('stripe/checkout/config/')
        .body({ checkout_config: [{ tax_number: { collect: true } }] })
        .expectStatus(404);
    });

    // The tier resource is generally available, so this concept must not appear on it.
    it('adds nothing to the tier itself', async function () {
      await setCheckout({ tax_number: { collect: true } });

      const { body } = await agent.get(`tiers/${paidTierId}/`).expectStatus(200);
      assert.equal(body.tiers[0].checkout, undefined);
      assert.equal(body.tiers[0].requirements, undefined);
    });
  });
});
