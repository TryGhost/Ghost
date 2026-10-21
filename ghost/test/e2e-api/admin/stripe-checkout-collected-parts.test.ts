import assert from 'node:assert/strict';
import { COLLECTED_PARTS, type CheckoutPartSetting, type CollectedPart } from '@tryghost/checkout';
import type { CheckoutSessionParams } from '../../../core/server/services/stripe/checkout-session-params';

const { agentProvider, fixtureManager, mockManager } = require('../../utils/e2e-framework');
const { stripeMocker } = require('../../utils/e2e-framework-mock-manager');
const models = require('../../../core/server/models');

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
}

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
  },
  tax_number: {
    noun: 'tax ID',
    on: (tiers = {}, options = {}) => ({ collect: true, ...tiers, ...options }),
    stripeParam: 'tax_id_collection',
    askedWith: { enabled: true },
    options: {},
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

  async function addPaidTier(id: string) {
    const [existing] = await models.Base.knex('products').where('id', paidTierId);
    await models.Base.knex('products').insert({
      ...existing,
      id,
      name: `Tier ${id.slice(-4)}`,
      slug: `tier-${id.slice(-4)}`,
    });
  }

  /** The session Ghost sent to Stripe for the checkout or preview it made last. */
  const lastSession = () => stripeMocker.checkoutSessions.at(-1);

  beforeAll(async function () {
    const agents = await agentProvider.getAgentsForMembers();
    adminAgent = agents.adminAgent;
    membersAgent = agents.membersAgent;
    await fixtureManager.init('members');
    await adminAgent.loginAsOwner();

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
    await models.Base.knex('members_metafields').del();
    await models.Base.knex('actions')
      .whereIn('resource_type', ['stripe_checkout_config', 'member_custom_field'])
      .del();
    await models.Base.knex('products').whereIn('id', [SECOND_TIER_ID, THIRD_TIER_ID]).del();
  });

  const describePart = <Part extends CollectedPart>(part: Part) => {
    const { noun, on, stripeParam, askedWith, options } = PARTS[part];

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
        await models.Base.knex('stripe_checkout_config_tiers').insert({
          section: part,
          product_id: freeTierId,
        });
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
