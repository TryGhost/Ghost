import assert from 'node:assert/strict';
import { COLLECTED_PARTS, type CheckoutPartSetting, type CollectedPart } from '@tryghost/checkout';
import type { CheckoutSessionParams } from '../../../core/server/services/stripe/checkout-session-params';

const { agentProvider, fixtureManager, mockManager } = require('../../utils/e2e-framework');
const { stripeMocker } = require('../../utils/e2e-framework-mock-manager');
const models = require('../../../core/server/models');
const tiersService = require('../../../core/server/services/tiers');

// Paid tiers inserted rather than created through the API, so no Stripe product is made for
// them. The cleanup names the same ids.
const SECOND_TIER_ID = 'ffffffffffffffffffffffff';
const THIRD_TIER_ID = 'fffffffffffffffffffffffe';

/** A part switched on, as the Admin API takes it. */
type SwitchedOn<Part extends CollectedPart> = Extract<CheckoutPartSetting<Part>, { collect: true }>;

/** What the rules every collected part shares need to know about a part. */
interface PartUnderTest<Part extends CollectedPart> {
  /** What the part collects, as refusals name it. */
  noun: string;
  /**
   * The part switched on with somewhere to save the answers, on every paid tier unless `tiers`
   * names some, and with any of its own options given.
   */
  on: (
    tiers?: { tier_ids?: string[] },
    options?: Partial<SwitchedOn<Part>>,
  ) => CheckoutPartSetting<Part>;
  /** The Checkout session parameter that asks for it. */
  stripeParam: keyof CheckoutSessionParams;
  /** What that parameter is once it asks, where it's the same on every checkout. */
  askedWith?: unknown;
  /** The part's own options, set to something other than their defaults. */
  options: Partial<SwitchedOn<Part>>;
  /**
   * The row naming one more tier for the part, where its tiers are stored: the tier requirement
   * it's required under, or the config for a part that lands nowhere.
   */
  storedTier: (tierId: string) => { table: string; row: Record<string, string> };
  /** What members on the part's tiers must give. Null for a part that lands nowhere. */
  requirement: {
    /** As a tier lists it: the port, and the parts it's asked in, each by its own port. */
    listed: { port: string; parts: Array<{ port: string; type: string }> };
    /** The custom field it can't be asked for without. */
    essentialKey: string;
  } | null;
}

/** Shipping as a tier lists it: asked for in the address and the recipient's name. */
const SHIPPING_REQUIRED = {
  port: 'checkout.shipping',
  parts: [
    { port: 'checkout.shipping.address', type: 'address' },
    { port: 'checkout.shipping.name', type: 'short_text' },
  ],
};

/** The phone as a tier lists it, asked for as itself. */
const PHONE_REQUIRED = {
  port: 'checkout.phone',
  parts: [{ port: 'checkout.phone', type: 'short_text' }],
};

const requiredOn = (port: string) => (tierId: string) => ({
  table: 'tier_requirement_tiers',
  row: { port, product_id: tierId },
});

const PARTS: { [Part in CollectedPart]: PartUnderTest<Part> } = {
  shipping: {
    noun: 'shipping address',
    on: (tiers = {}, options = {}) => ({
      collect: true,
      address: { custom_field_key: 'delivery_address' },
      name: { custom_field_key: 'recipient_name' },
      ...tiers,
      ...options,
    }),
    stripeParam: 'shipping_address_collection',
    options: { allowed_countries: ['GB'] },
    storedTier: requiredOn('checkout.shipping'),
    requirement: { listed: SHIPPING_REQUIRED, essentialKey: 'delivery_address' },
  },
  phone: {
    noun: 'phone number',
    on: (tiers = {}, options = {}) => ({
      collect: true,
      custom_field_key: 'contact_phone',
      ...tiers,
      ...options,
    }),
    stripeParam: 'phone_number_collection',
    askedWith: { enabled: true },
    options: {},
    storedTier: requiredOn('checkout.phone'),
    requirement: { listed: PHONE_REQUIRED, essentialKey: 'contact_phone' },
  },
  tax_number: {
    noun: 'tax ID',
    on: (tiers = {}, options = {}) => ({ collect: true, ...tiers, ...options }),
    stripeParam: 'tax_id_collection',
    askedWith: { enabled: true },
    options: {},
    storedTier: (tierId) => ({
      table: 'stripe_checkout_config_tiers',
      row: { section: 'tax_number', product_id: tierId },
    }),
    // Stripe keeps the tax ID, so no member needs it in a field.
    requirement: null,
  },
};

/** The custom fields every part saves into, so any part can be switched on. */
const FIELDS = [
  { name: 'Delivery address', type: 'address' },
  { name: 'Recipient name', type: 'short_text' },
  { name: 'Contact phone', type: 'short_text' },
];

const OFF = { collect: false };

describe('Stripe Checkout collected parts', function () {
  let adminAgent: any;
  let membersAgent: any;
  let contentAPIAgent: any;
  let paidTierId: string;
  let freeTierId: string;

  async function setCheckout(config: Record<string, unknown>, status = 200) {
    const { body } = await adminAgent
      .put('stripe/checkout/config/')
      .body({ checkout_config: [config] })
      .expectStatus(status);
    return body;
  }

  async function readCheckout() {
    const { body } = await adminAgent.get('stripe/checkout/config/').expectStatus(200);
    return body.checkout_config[0];
  }

  async function refusal(config: Record<string, unknown>) {
    const body = await setCheckout(config, 422);
    return { property: body.errors[0].property, message: body.errors[0].context };
  }

  /**
   * Tiers are read into memory when Ghost boots, so after writing one straight to the database
   * they are read again, as the fixtures do.
   */
  const reloadTiers = () => tiersService.repository.init();

  async function addPaidTier(id: string) {
    const [existing] = await models.Base.knex('products').where('id', paidTierId);
    await models.Base.knex('products').insert({
      ...existing,
      id,
      name: `Tier ${id.slice(-4)}`,
      slug: `tier-${id.slice(-4)}`,
    });
    await reloadTiers();
  }

  /** The session Ghost sent to Stripe for the checkout or preview it made last. */
  const lastSession = () => stripeMocker.checkoutSessions.at(-1);

  async function setFieldStatus(key: string, status: 'active' | 'archived') {
    await adminAgent
      .put(`members/metafields/custom/${key}/`)
      .body({ members_metafields: [{ status }] })
      .expectStatus(200);
  }

  /** What a tier's members must give, as the Admin API shows it. */
  async function requirementsOn(tierId: string) {
    const { body } = await adminAgent
      .get(`tiers/${tierId}/?include=requirements`)
      .expectStatus(200);
    return body.tiers[0].requirements;
  }

  beforeAll(async function () {
    const agents = await agentProvider.getAgentsForMembers();
    adminAgent = agents.adminAgent;
    membersAgent = agents.membersAgent;
    contentAPIAgent = agents.contentAPIAgent;
    await fixtureManager.init('members', 'api_keys');
    await adminAgent.loginAsOwner();
    await contentAPIAgent.authenticate();

    const { body } = await adminAgent.get('tiers/?limit=all').expectStatus(200);
    paidTierId = body.tiers.find((tier: { type: string }) => tier.type === 'paid').id;
    freeTierId = body.tiers.find((tier: { type: string }) => tier.type === 'free').id;
  });

  beforeEach(async function () {
    mockManager.mockStripe();
    mockManager.mockLabsEnabled('stripeCheckoutCollection');
    mockManager.mockLabsEnabled('membersCustomFields');
    // Automatic tax asks for a tax ID on every checkout by itself.
    mockManager.mockLabsDisabled('stripeAutomaticTax');
    for (const field of FIELDS) {
      await adminAgent
        .post('members/metafields/custom/')
        .body({ members_metafields: [field] })
        .expectStatus(201);
    }
  });

  afterEach(async function () {
    mockManager.restore();
    await models.Base.knex('stripe_checkout_config_tiers').del();
    await models.Base.knex('stripe_checkout_config').del();
    await models.Base.knex('members_metafield_bindings').del();
    await models.Base.knex('tier_requirement_tiers').del();
    await models.Base.knex('tier_requirements').del();
    await models.Base.knex('members_metafields').del();
    await models.Base.knex('actions')
      .whereIn('resource_type', ['stripe_checkout_config', 'member_custom_field'])
      .del();
    await models.Base.knex('products').whereIn('id', [SECOND_TIER_ID, THIRD_TIER_ID]).del();
    await reloadTiers();
  });

  const describePart = <Part extends CollectedPart>(part: Part) => {
    const { noun, on, stripeParam, askedWith, options, storedTier, requirement } = PARTS[part];

    /** Checks a session Ghost sent to Stripe asks for the part. */
    const assertAsks = (session: Record<string, unknown>) => {
      if (askedWith === undefined) {
        assert.ok(session[stripeParam]);
      } else {
        assert.deepEqual(session[stripeParam], askedWith);
      }
    };

    describe(`${part}: saving`, function () {
      it('starts switched off', async function () {
        assert.deepEqual((await readCheckout())[part], OFF);
      });

      it('reads back exactly as saved, so what it reads can be saved back', async function () {
        await setCheckout({ [part]: on() });

        const saved = await readCheckout();
        assert.deepEqual(saved[part], on());

        await setCheckout(saved);
        assert.deepEqual(await readCheckout(), saved);
      });

      it('covers every paid tier unless it names some, each once', async function () {
        await addPaidTier(SECOND_TIER_ID);

        await setCheckout({
          [part]: on({ tier_ids: [SECOND_TIER_ID, paidTierId, SECOND_TIER_ID] }),
        });
        assert.deepEqual(
          [...(await readCheckout())[part].tier_ids].sort(),
          [paidTierId, SECOND_TIER_ID].sort(),
        );

        await setCheckout({ [part]: on() });
        assert.equal((await readCheckout())[part].tier_ids, undefined);
      });

      it('refuses tiers that have no checkout to ask at', async function () {
        assert.deepEqual(await refusal({ [part]: on({ tier_ids: [freeTierId] }) }), {
          property: `${part}.tier_ids`,
          message: `Only paid tiers have a checkout to collect a ${noun} at.`,
        });
        assert.deepEqual(await refusal({ [part]: on({ tier_ids: [SECOND_TIER_ID] }) }), {
          property: `${part}.tier_ids`,
          message: `Unknown tier: ${SECOND_TIER_ID}`,
        });
        assert.equal(
          (await refusal({ [part]: on({ tier_ids: [] }) })).property,
          `${part}.tier_ids`,
        );
        assert.deepEqual((await readCheckout())[part], OFF);
      });

      it('forgets its tiers and options once switched off, so switching back on starts afresh', async function () {
        await addPaidTier(SECOND_TIER_ID);
        await setCheckout({ [part]: on({ tier_ids: [SECOND_TIER_ID] }, options) });

        await setCheckout({ [part]: OFF });
        assert.deepEqual((await readCheckout())[part], OFF);

        await setCheckout({ [part]: on() });
        assert.deepEqual((await readCheckout())[part], on());
      });

      it('leaves the design alone, and saving the design leaves it alone', async function () {
        const design = {
          customize: true,
          button_color: '#ff5a1f',
          background_color: '#ffffff',
          border_style: 'pill',
          font_family: 'roboto_slab',
        };
        await setCheckout({ design });
        await setCheckout({ [part]: on() });

        assert.deepEqual((await readCheckout()).design, design);
        assert.deepEqual((await setCheckout({ design })).checkout_config[0][part], on());
      });

      it('drops a deleted tier, and switches off when the last tier it named is deleted', async function () {
        await addPaidTier(SECOND_TIER_ID);
        await addPaidTier(THIRD_TIER_ID);
        await setCheckout({ [part]: on({ tier_ids: [SECOND_TIER_ID, THIRD_TIER_ID] }) });

        await models.Base.knex('products').where('id', SECOND_TIER_ID).del();
        assert.deepEqual((await readCheckout())[part].tier_ids, [THIRD_TIER_ID]);

        // Never widens to every tier.
        await models.Base.knex('products').where('id', THIRD_TIER_ID).del();
        assert.deepEqual((await readCheckout())[part], OFF);
      });

      it('only counts the named tiers that are paid', async function () {
        await addPaidTier(SECOND_TIER_ID);
        await setCheckout({ [part]: on({ tier_ids: [SECOND_TIER_ID] }) });
        // The API refuses a free tier, so one can only be on the list if it got there another way.
        const { table, row } = storedTier(freeTierId);
        await models.Base.knex(table).insert(row);
        assert.deepEqual((await readCheckout())[part].tier_ids, [SECOND_TIER_ID]);

        // A free tier left on the list never keeps it on.
        await models.Base.knex('products').where('id', SECOND_TIER_ID).del();
        assert.deepEqual((await readCheckout())[part], OFF);
      });

      it('is left out, and refused, while its flag is off', async function () {
        mockManager.mockLabsDisabled('stripeCheckoutCollection');

        assert.equal((await readCheckout())[part], undefined);
        assert.deepEqual(await refusal({ [part]: on() }), {
          property: part,
          message: `${noun[0].toUpperCase()}${noun.slice(1)} collection is not available yet.`,
        });
      });
    });

    if (requirement) {
      const { listed, essentialKey } = requirement;
      describe(`${part}: tier requirements`, function () {
        it('is required of members on its tiers, with the parts it is asked in, and stops once off', async function () {
          await addPaidTier(SECOND_TIER_ID);

          await setCheckout({ [part]: on({ tier_ids: [SECOND_TIER_ID] }) });
          assert.deepEqual(await requirementsOn(SECOND_TIER_ID), [listed]);
          assert.deepEqual(await requirementsOn(paidTierId), []);

          await setCheckout({ [part]: on() });
          assert.deepEqual(await requirementsOn(paidTierId), [listed]);
          assert.deepEqual(await requirementsOn(freeTierId), []);

          await setCheckout({ [part]: OFF });
          assert.deepEqual(await requirementsOn(SECOND_TIER_ID), []);
        });

        it('is left off its tiers while the field it cannot be asked without is archived', async function () {
          await setCheckout({ [part]: on() });

          await setFieldStatus(essentialKey, 'archived');
          assert.deepEqual(await requirementsOn(paidTierId), []);

          await setFieldStatus(essentialKey, 'active');
          assert.deepEqual(await requirementsOn(paidTierId), [listed]);
        });
      });
    }

    describe(`${part}: Preview in Stripe`, function () {
      function requestPreview(previewed: Record<string, unknown> | undefined, status: number) {
        return adminAgent
          .post('stripe/checkout/preview/')
          .body({
            checkout_preview: [
              {
                tier_id: paidTierId,
                design: { customize: false },
                ...(previewed ? { [part]: previewed } : {}),
              },
            ],
          })
          .expectStatus(status);
      }

      async function preview(previewed?: Record<string, unknown>) {
        await requestPreview(previewed, 200);
        return lastSession();
      }

      it('asks for it as the settings being edited say, saved or not', async function () {
        await addPaidTier(SECOND_TIER_ID);

        assertAsks(await preview(on()));
        assert.equal((await preview(on({ tier_ids: [SECOND_TIER_ID] })))[stripeParam], undefined);
        assert.equal((await preview(OFF))[stripeParam], undefined);
      });

      it('refuses what saving refuses, and opens no checkout', async function () {
        const { body } = await requestPreview(on({ tier_ids: [freeTierId] }), 422);

        assert.deepEqual(
          { property: body.errors[0].property, message: body.errors[0].context },
          {
            property: `${part}.tier_ids`,
            message: `Only paid tiers have a checkout to collect a ${noun} at.`,
          },
        );
        assert.equal(stripeMocker.checkoutSessions.length, 0);
      });

      it('asks as the saved settings say when the preview leaves it out', async function () {
        await setCheckout({ [part]: on() });

        assertAsks(await preview());
        assert.equal((await preview(OFF))[stripeParam], undefined);
      });

      it('is refused while its flag is off, as saving it is', async function () {
        mockManager.mockLabsDisabled('stripeCheckoutCollection');
        const { body } = await requestPreview(on(), 422);

        assert.deepEqual(
          { property: body.errors[0].property, message: body.errors[0].context },
          {
            property: part,
            message: `${noun[0].toUpperCase()}${noun.slice(1)} collection is not available yet.`,
          },
        );
        assert.equal(stripeMocker.checkoutSessions.length, 0);
      });
    });

    describe(`${part}: checkouts`, function () {
      async function startCheckout() {
        await membersAgent
          .post('/api/create-stripe-checkout-session/')
          .body({ tierId: paidTierId, cadence: 'month' })
          .expectStatus(200);
        return lastSession();
      }

      it('asks for it once it is switched on, and only then', async function () {
        assert.equal((await startCheckout())[stripeParam], undefined);

        await setCheckout({ [part]: on() });
        assertAsks(await startCheckout());

        await setCheckout({ [part]: OFF });
        assert.equal((await startCheckout())[stripeParam], undefined);
      });

      it('asks only on the tiers it names', async function () {
        await addPaidTier(SECOND_TIER_ID);

        await setCheckout({ [part]: on({ tier_ids: [SECOND_TIER_ID] }) });
        assert.equal((await startCheckout())[stripeParam], undefined);

        await setCheckout({ [part]: on({ tier_ids: [paidTierId, SECOND_TIER_ID] }) });
        assertAsks(await startCheckout());
      });

      it('asks nothing while its flag is off, even when it is on', async function () {
        await setCheckout({ [part]: on() });
        mockManager.mockLabsDisabled('stripeCheckoutCollection');

        assert.equal((await startCheckout())[stripeParam], undefined);
      });
    });
  };
  COLLECTED_PARTS.forEach(describePart);

  it('lists the same parts whichever custom fields a save moves them to', async function () {
    await addPaidTier(SECOND_TIER_ID);
    await adminAgent
      .post('members/metafields/custom/')
      .body({ members_metafields: [{ name: 'Mobile phone', type: 'short_text' }] })
      .expectStatus(201);
    await setCheckout({
      shipping: PARTS.shipping.on({ tier_ids: [SECOND_TIER_ID] }),
      phone: PARTS.phone.on(),
    });

    // The phone's field becomes the recipient's name, and the phone moves to another field.
    await setCheckout({
      shipping: PARTS.shipping.on(
        { tier_ids: [SECOND_TIER_ID] },
        { name: { custom_field_key: 'contact_phone' } },
      ),
      phone: PARTS.phone.on({}, { custom_field_key: 'mobile_phone' }),
    });

    // Tiers say what to ask for, not where the answers are kept.
    assert.deepEqual(await requirementsOn(SECOND_TIER_ID), [PHONE_REQUIRED, SHIPPING_REQUIRED]);
    assert.deepEqual(await requirementsOn(paidTierId), [PHONE_REQUIRED]);
  });

  it("keeps shipping on its tiers while the recipient's name is archived, but not once it's deleted", async function () {
    await setCheckout({ shipping: PARTS.shipping.on() });

    // Without the name, the address is still kept.
    await setFieldStatus('recipient_name', 'archived');
    assert.deepEqual(await requirementsOn(paidTierId), [
      {
        port: 'checkout.shipping',
        parts: [{ port: 'checkout.shipping.address', type: 'address' }],
      },
    ]);

    // Deleted, it leaves shipping without somewhere to keep the name, which reads as off.
    await adminAgent.delete('members/metafields/custom/recipient_name/').expectStatus(204);
    assert.deepEqual(await requirementsOn(paidTierId), []);
    assert.equal((await readCheckout()).shipping.collect, false);
  });

  it('lists what members must give to anyone who asks, through the Content API, only while checkouts ask for it', async function () {
    await setCheckout({ phone: PARTS.phone.on() });
    const listsNone = (tiers: object[]) => tiers.every((tier) => !('requirements' in tier));

    const { body } = await contentAPIAgent.get('/tiers/?include=requirements').expectStatus(200);
    assert.deepEqual(
      body.tiers.find((tier: { id: string }) => tier.id === paidTierId).requirements,
      [PHONE_REQUIRED],
    );

    // Readers that don't ask, such as themes listing tiers, don't pay for reading them.
    const { body: unasked } = await contentAPIAgent.get('/tiers/').expectStatus(200);
    assert.ok(listsNone(unasked.tiers));

    mockManager.mockLabsDisabled('stripeCheckoutCollection');
    const { body: content } = await contentAPIAgent
      .get('/tiers/?include=requirements')
      .expectStatus(200);
    assert.ok(listsNone(content.tiers));
    const { body: admin } = await adminAgent
      .get(`tiers/${paidTierId}/?include=requirements`)
      .expectStatus(200);
    assert.ok(listsNone(admin.tiers));

    // Collection only releases after the design, so checkouts ask for nothing without it.
    mockManager.mockLabsEnabled('stripeCheckoutCollection');
    mockManager.mockLabsDisabled('stripeCheckoutDesign');
    const { body: designOff } = await contentAPIAgent
      .get('/tiers/?include=requirements')
      .expectStatus(200);
    assert.ok(listsNone(designOff.tiers));
  });

  it('lists what members must give on a tier as it is saved, when asked', async function () {
    await setCheckout({ phone: PARTS.phone.on() });

    // A requirement on every paid tier covers a new tier straight away.
    const { body: added } = await adminAgent
      .post('tiers/?include=requirements')
      .body({
        tiers: [
          {
            name: 'Tier added while the phone is required',
            currency: 'usd',
            monthly_price: 500,
            yearly_price: 5000,
          },
        ],
      })
      .expectStatus(201);
    assert.deepEqual(added.tiers[0].requirements, [PHONE_REQUIRED]);

    const { body: saved } = await adminAgent.get(`tiers/${paidTierId}/`).expectStatus(200);
    const { body: edited } = await adminAgent
      .put(`tiers/${paidTierId}/?include=requirements`)
      .body({ tiers: [{ name: saved.tiers[0].name }] })
      .expectStatus(200);
    assert.deepEqual(edited.tiers[0].requirements, [PHONE_REQUIRED]);
  });

  it('clears the site cache when what tiers list changes', async function () {
    // Tiers list to anyone what their members must give, so a cached list would go stale.
    const save = (config: Record<string, unknown>) =>
      adminAgent
        .put('stripe/checkout/config/')
        .body({ checkout_config: [config] })
        .expectStatus(200);
    const design = await save({ design: { customize: false } });
    assert.equal(design.headers['x-cache-invalidate'], undefined);

    const saved = await save({ phone: PARTS.phone.on() });
    assert.equal(saved.headers['x-cache-invalidate'], '/*');

    // Admin sends every part it offers on each save, so one changing only the design leaves it.
    const resaved = await save({ design: { customize: false }, phone: PARTS.phone.on() });
    assert.equal(resaved.headers['x-cache-invalidate'], undefined);

    const narrowed = await save({ phone: PARTS.phone.on({ tier_ids: [paidTierId] }) });
    assert.equal(narrowed.headers['x-cache-invalidate'], '/*');

    // Tiers don't say where the answers are kept, so moving them to another field leaves them.
    for (const key of ['recipient_name', 'contact_phone']) {
      const moved = await save({
        phone: PARTS.phone.on({ tier_ids: [paidTierId] }, { custom_field_key: key }),
      });
      assert.equal(moved.headers['x-cache-invalidate'], undefined);
    }

    const unbound = await adminAgent
      .put('members/metafields/custom/recipient_name/')
      .body({ members_metafields: [{ status: 'archived' }] })
      .expectStatus(200);
    assert.equal(unbound.headers['x-cache-invalidate'], undefined);

    // Tiers don't list fields, so a rename leaves them as they were.
    const renamed = await adminAgent
      .put('members/metafields/custom/contact_phone/')
      .body({ members_metafields: [{ name: 'Mobile phone' }] })
      .expectStatus(200);
    assert.equal(renamed.headers['x-cache-invalidate'], undefined);

    // Archived, the phone can't be asked for, so tiers stop listing it.
    const archived = await adminAgent
      .put('members/metafields/custom/contact_phone/')
      .body({ members_metafields: [{ status: 'archived' }] })
      .expectStatus(200);
    assert.equal(archived.headers['x-cache-invalidate'], '/*');

    const deleted = await adminAgent
      .delete('members/metafields/custom/contact_phone/')
      .expectStatus(204);
    assert.equal(deleted.headers['x-cache-invalidate'], '/*');
  });

  it('keeps each part to its own tiers, saved and at checkout', async function () {
    await addPaidTier(SECOND_TIER_ID);
    await addPaidTier(THIRD_TIER_ID);
    const tiersOf: Record<CollectedPart, string[]> = {
      shipping: [SECOND_TIER_ID],
      phone: [THIRD_TIER_ID],
      tax_number: [paidTierId, SECOND_TIER_ID],
    };

    await setCheckout(
      Object.fromEntries(
        COLLECTED_PARTS.map((part) => [part, PARTS[part].on({ tier_ids: tiersOf[part] })]),
      ),
    );
    await membersAgent
      .post('/api/create-stripe-checkout-session/')
      .body({ tierId: paidTierId, cadence: 'month' })
      .expectStatus(200);
    for (const part of COLLECTED_PARTS) {
      assert.equal(
        Boolean(lastSession()[PARTS[part].stripeParam]),
        tiersOf[part].includes(paidTierId),
        `${part} asks on the paid tier only when it names it`,
      );
    }

    const [switchedOff, ...kept] = COLLECTED_PARTS;
    await setCheckout({ [switchedOff]: OFF });

    const saved = await readCheckout();
    assert.deepEqual(saved[switchedOff], OFF);
    for (const part of kept) {
      assert.deepEqual([...saved[part].tier_ids].sort(), [...tiersOf[part]].sort());
    }
  });
});
