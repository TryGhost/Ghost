const assert = require('node:assert/strict');
const querystring = require('querystring');
const {
  agentProvider,
  mockManager,
  fixtureManager,
  matchers,
  hostLimits,
} = require('../../utils/e2e-framework');
const nock = require('nock');
const { stripeMocker } = require('../../utils/e2e-framework-mock-manager');
const models = require('../../../core/server/models');
const membersService = require('../../../core/server/services/members');
const urlServiceUtils = require('../../utils/url-service-utils');

let membersAgent, adminAgent;

async function getPost(id) {
  // eslint-disable-next-line dot-notation
  return await models['Post'].where('id', id).fetch({ require: true });
}

describe('Create Stripe Checkout Session', function () {
  beforeAll(async function () {
    const agents = await agentProvider.getAgentsForMembers();
    membersAgent = agents.membersAgent;
    adminAgent = agents.adminAgent;

    await fixtureManager.init('posts', 'members');
    await adminAgent.loginAsOwner();
  });

  beforeEach(function () {
    mockManager.mockMail();
  });

  afterEach(function () {
    mockManager.restore();
  });

  it('Does not allow an unauthenticated request to create a checkout session for an existing paid member', async function () {
    const {
      body: { tiers },
    } = await adminAgent.get('/tiers/?include=monthly_price&yearly_price');

    const paidTier = tiers.find((tier) => tier.type === 'paid');

    await membersAgent
      .post('/api/create-stripe-checkout-session/')
      .body({
        customerEmail: 'paid@test.com',
        tierId: paidTier.id,
        cadence: 'month',
      })
      .expectStatus(403)
      .matchBodySnapshot({
        errors: [
          {
            id: matchers.anyUuid,
            code: 'CANNOT_CHECKOUT_WITH_EXISTING_SUBSCRIPTION',
          },
        ],
      })
      .matchHeaderSnapshot({
        etag: matchers.anyEtag,
      });
  });

  it('Does not allow an authenticated paid member to create another subscription', async function () {
    const {
      body: { tiers },
    } = await adminAgent.get('/tiers/?include=monthly_price&yearly_price');
    const paidTier = tiers.find((tier) => tier.type === 'paid');
    const member = await models.Member.findOne({ email: 'paid@test.com' });
    const identity = await membersService.api.getMemberIdentityToken(member.get('transient_id'));

    const { body } = await membersAgent
      .post('/api/create-stripe-checkout-session/')
      .body({ identity, tierId: paidTier.id, cadence: 'month' })
      .expectStatus(403);

    assert.equal(body.errors[0].code, 'CANNOT_CHECKOUT_WITH_EXISTING_SUBSCRIPTION');
  });

  it('Can create a checkout session when using offers', async function () {
    const {
      body: { tiers },
    } = await adminAgent.get('/tiers/?include=monthly_price&yearly_price');
    const paidTier = tiers.find((tier) => tier.type === 'paid');
    const {
      body: {
        offers: [offer],
      },
    } = await adminAgent.post('/offers/').body({
      offers: [
        {
          name: 'Test Offer',
          code: 'test-offer',
          cadence: 'month',
          status: 'active',
          currency: 'usd',
          type: 'percent',
          amount: 20,
          duration: 'once',
          duration_in_months: null,
          display_title: 'Test Offer',
          display_description: null,
          tier: {
            id: paidTier.id,
          },
        },
      ],
    });

    nock('https://api.stripe.com')
      .persist()
      .get(/v1\/.*/)
      .reply((uri) => {
        const [match, resource, id] = uri.match(/\/v1\/(\w+)\/(.+)\/?/) || [null];
        if (match) {
          if (resource === 'products') {
            return [
              200,
              {
                id: id,
                active: true,
              },
            ];
          }
          if (resource === 'prices') {
            return [
              200,
              {
                id: id,
                active: true,
                currency: 'usd',
                unit_amount: 500,
                recurring: {
                  interval: 'month',
                },
              },
            ];
          }
        }

        return [500];
      });

    nock('https://api.stripe.com')
      .persist()
      .post(/v1\/.*/)
      .reply((uri) => {
        if (uri === '/v1/checkout/sessions') {
          return [200, { id: 'cs_123', url: 'https://site.com' }];
        }

        if (uri === '/v1/coupons') {
          return [200, { id: 'coupon_123' }];
        }

        if (uri === '/v1/prices') {
          return [
            200,
            {
              id: 'price_1',
              active: true,
              currency: 'usd',
              unit_amount: 500,
              recurring: {
                interval: 'month',
              },
            },
          ];
        }

        return [500];
      });

    await membersAgent
      .post('/api/create-stripe-checkout-session/')
      .body({
        customerEmail: 'free@test.com',
        offerId: offer.id,
      })
      .expectStatus(200)
      .matchBodySnapshot()
      .matchHeaderSnapshot();
  });

  it('Can create a checkout session without passing a customerEmail', async function () {
    const {
      body: { tiers },
    } = await adminAgent.get('/tiers/?include=monthly_price&yearly_price');

    const paidTier = tiers.find((tier) => tier.type === 'paid');

    nock('https://api.stripe.com')
      .persist()
      .get(/v1\/.*/)
      .reply((uri) => {
        const [match, resource, id] = uri.match(/\/v1\/(\w+)\/(.+)\/?/) || [null];
        if (match) {
          if (resource === 'products') {
            return [
              200,
              {
                id: id,
                active: true,
              },
            ];
          }
          if (resource === 'prices') {
            return [
              200,
              {
                id: id,
                active: true,
                currency: 'usd',
                unit_amount: 500,
                recurring: {
                  interval: 'month',
                },
              },
            ];
          }
        }

        return [500];
      });

    nock('https://api.stripe.com')
      .persist()
      .post(/v1\/.*/)
      .reply((uri, body) => {
        if (uri === '/v1/checkout/sessions') {
          const bodyJSON = querystring.parse(body);
          // TODO: Actually work out what Stripe checks and when/how it errors
          if (Reflect.has(bodyJSON, 'customerEmail')) {
            return [400, { error: 'Invalid Email' }];
          }
          return [200, { id: 'cs_123', url: 'https://site.com' }];
        }

        if (uri === '/v1/prices') {
          return [
            200,
            {
              id: 'price_2',
              active: true,
              currency: 'usd',
              unit_amount: 500,
              recurring: {
                interval: 'month',
              },
            },
          ];
        }

        return [500];
      });

    await membersAgent
      .post('/api/create-stripe-checkout-session/')
      .body({
        tierId: paidTier.id,
        cadence: 'month',
      })
      .expectStatus(200)
      .matchBodySnapshot()
      .matchHeaderSnapshot();
  });

  it('Does allow to create a checkout session if the customerEmail is not associated with an existing member', async function () {
    const {
      body: { tiers },
    } = await adminAgent.get('/tiers/?include=monthly_price&yearly_price');

    const paidTier = tiers.find((tier) => tier.type === 'paid');

    nock('https://api.stripe.com')
      .persist()
      .get(/v1\/.*/)
      .reply((uri) => {
        const [match, resource, id] = uri.match(/\/v1\/(\w+)\/(.+)\/?/) || [null];
        if (match) {
          if (resource === 'products') {
            return [
              200,
              {
                id: id,
                active: true,
              },
            ];
          }
          if (resource === 'prices') {
            return [
              200,
              {
                id: id,
                active: true,
                currency: 'usd',
                unit_amount: 500,
                recurring: {
                  interval: 'month',
                },
              },
            ];
          }
        }

        return [500];
      });

    nock('https://api.stripe.com')
      .persist()
      .post(/v1\/.*/)
      .reply((uri) => {
        if (uri === '/v1/checkout/sessions') {
          return [200, { id: 'cs_123', url: 'https://site.com' }];
        }
        if (uri === '/v1/prices') {
          return [
            200,
            {
              id: 'price_3',
              active: true,
              currency: 'usd',
              unit_amount: 500,
              recurring: {
                interval: 'month',
              },
            },
          ];
        }

        return [500];
      });

    await membersAgent
      .post('/api/create-stripe-checkout-session/')
      .body({
        customerEmail: 'free@test.com',
        tierId: paidTier.id,
        cadence: 'month',
      })
      .expectStatus(200)
      .matchBodySnapshot()
      .matchHeaderSnapshot();
  });

  /**
   * When a checkout session is created with an urlHistory, we should convert it to an
   * attribution and check if that is set in the metadata of the stripe session
   */
  describe('Member attribution', function () {
    it('Does pass url attribution source to session metadata', async function () {
      const {
        body: { tiers },
      } = await adminAgent.get('/tiers/?include=monthly_price&yearly_price');

      const paidTier = tiers.find((tier) => tier.type === 'paid');

      nock('https://api.stripe.com')
        .persist()
        .get(/v1\/.*/)
        .reply((uri) => {
          const [match, resource, id] = uri.match(/\/v1\/(\w+)\/(.+)\/?/) || [null];
          if (match) {
            if (resource === 'products') {
              return [
                200,
                {
                  id: id,
                  active: true,
                },
              ];
            }
            if (resource === 'prices') {
              return [
                200,
                {
                  id: id,
                  active: true,
                  currency: 'usd',
                  unit_amount: 500,
                  recurring: {
                    interval: 'month',
                  },
                },
              ];
            }
          }

          return [500];
        });

      const scope = nock('https://api.stripe.com')
        .persist()
        .post(/v1\/.*/)
        .reply((uri, body) => {
          if (uri === '/v1/checkout/sessions') {
            const parsed = new URLSearchParams(body);
            assert.equal(parsed.get('metadata[attribution_url]'), '/test');
            assert.equal(parsed.get('metadata[attribution_type]'), 'url');
            assert.equal(parsed.get('metadata[attribution_id]'), null);

            return [200, { id: 'cs_123', url: 'https://site.com' }];
          }
          if (uri === '/v1/prices') {
            return [
              200,
              {
                id: 'price_4',
                active: true,
                currency: 'usd',
                unit_amount: 500,
                recurring: {
                  interval: 'month',
                },
              },
            ];
          }

          return [500];
        });

      await membersAgent
        .post('/api/create-stripe-checkout-session/')
        .body({
          customerEmail: 'attribution@test.com',
          tierId: paidTier.id,
          cadence: 'month',
          metadata: {
            urlHistory: [
              {
                path: '/test',
                time: Date.now(),
              },
            ],
          },
        })
        .expectStatus(200)
        .matchBodySnapshot()
        .matchHeaderSnapshot();

      assert.equal(scope.isDone(), true);
    });

    it('Does pass post attribution source to session metadata', async function () {
      const post = await getPost(fixtureManager.get('posts', 0).id);
      const url = urlServiceUtils.urlFor(post, 'posts', { absolute: false });

      const {
        body: { tiers },
      } = await adminAgent.get('/tiers/?include=monthly_price&yearly_price');

      const paidTier = tiers.find((tier) => tier.type === 'paid');

      nock('https://api.stripe.com')
        .persist()
        .get(/v1\/.*/)
        .reply((uri) => {
          const [match, resource, id] = uri.match(/\/v1\/(\w+)\/(.+)\/?/) || [null];
          if (match) {
            if (resource === 'products') {
              return [
                200,
                {
                  id: id,
                  active: true,
                },
              ];
            }
            if (resource === 'prices') {
              return [
                200,
                {
                  id: id,
                  active: true,
                  currency: 'usd',
                  unit_amount: 50,
                  recurring: {
                    interval: 'month',
                  },
                },
              ];
            }
          }

          return [500];
        });

      const scope = nock('https://api.stripe.com')
        .persist()
        .post(/v1\/.*/)
        .reply((uri, body) => {
          if (uri === '/v1/checkout/sessions') {
            const parsed = new URLSearchParams(body);
            assert.equal(parsed.get('metadata[attribution_url]'), url);
            assert.equal(parsed.get('metadata[attribution_type]'), 'post');
            assert.equal(parsed.get('metadata[attribution_id]'), post.id);

            return [200, { id: 'cs_123', url: 'https://site.com' }];
          }
          if (uri === '/v1/prices') {
            return [
              200,
              {
                id: 'price_5',
                active: true,
                currency: 'usd',
                unit_amount: 500,
                recurring: {
                  interval: 'month',
                },
              },
            ];
          }

          return [500];
        });

      await membersAgent
        .post('/api/create-stripe-checkout-session/')
        .body({
          customerEmail: 'attribution-post@test.com',
          tierId: paidTier.id,
          cadence: 'month',
          metadata: {
            urlHistory: [
              {
                path: url,
                time: Date.now(),
              },
            ],
          },
        })
        .expectStatus(200)
        .matchBodySnapshot()
        .matchHeaderSnapshot();

      assert.equal(scope.isDone(), true);
    });

    it('Ignores attribution_* values in metadata', async function () {
      const {
        body: { tiers },
      } = await adminAgent.get('/tiers/?include=monthly_price&yearly_price');

      const paidTier = tiers.find((tier) => tier.type === 'paid');

      nock('https://api.stripe.com')
        .persist()
        .get(/v1\/.*/)
        .reply((uri) => {
          const [match, resource, id] = uri.match(/\/v1\/(\w+)\/(.+)\/?/) || [null];
          if (match) {
            if (resource === 'products') {
              return [
                200,
                {
                  id: id,
                  active: true,
                },
              ];
            }
            if (resource === 'prices') {
              return [
                200,
                {
                  id: id,
                  active: true,
                  currency: 'usd',
                  unit_amount: 500,
                  recurring: {
                    interval: 'month',
                  },
                },
              ];
            }
          }

          return [500];
        });

      const scope = nock('https://api.stripe.com')
        .persist()
        .post(/v1\/.*/)
        .reply((uri, body) => {
          if (uri === '/v1/checkout/sessions') {
            const parsed = new URLSearchParams(body);
            assert.equal(parsed.get('metadata[attribution_url]'), null);
            assert.equal(parsed.get('metadata[attribution_type]'), null);
            assert.equal(parsed.get('metadata[attribution_id]'), null);

            return [200, { id: 'cs_123', url: 'https://site.com' }];
          }
          if (uri === '/v1/prices') {
            return [
              200,
              {
                id: 'price_6',
                active: true,
                currency: 'usd',
                unit_amount: 500,
                recurring: {
                  interval: 'month',
                },
              },
            ];
          }

          return [500];
        });

      await membersAgent
        .post('/api/create-stripe-checkout-session/')
        .body({
          customerEmail: 'attribution-2@test.com',
          tierId: paidTier.id,
          cadence: 'month',
          metadata: {
            attribution_type: 'url',
            attribution_url: '/',
            attribution_id: null,
          },
        })
        .expectStatus(200)
        .matchBodySnapshot()
        .matchHeaderSnapshot();

      assert.equal(scope.isDone(), true);
    });

    it('Does pass UTM parameters to session metadata', async function () {
      const {
        body: { tiers },
      } = await adminAgent.get('/tiers/?include=monthly_price&yearly_price');

      const paidTier = tiers.find((tier) => tier.type === 'paid');

      nock('https://api.stripe.com')
        .persist()
        .get(/v1\/.*/)
        .reply((uri) => {
          const [match, resource, id] = uri.match(/\/v1\/(\w+)\/(.+)\/?/) || [null];
          if (match) {
            if (resource === 'products') {
              return [
                200,
                {
                  id: id,
                  active: true,
                },
              ];
            }
            if (resource === 'prices') {
              return [
                200,
                {
                  id: id,
                  active: true,
                  currency: 'usd',
                  unit_amount: 500,
                  recurring: {
                    interval: 'month',
                  },
                },
              ];
            }
          }

          return [500];
        });

      const scope = nock('https://api.stripe.com')
        .persist()
        .post(/v1\/.*/)
        .reply((uri, body) => {
          if (uri === '/v1/checkout/sessions') {
            const parsed = new URLSearchParams(body);

            // Check UTM parameters are passed through
            assert.equal(parsed.get('subscription_data[metadata][utm_source]'), 'newsletter');
            assert.equal(parsed.get('subscription_data[metadata][utm_medium]'), 'email');
            assert.equal(parsed.get('subscription_data[metadata][utm_campaign]'), 'spring_sale');
            assert.equal(parsed.get('subscription_data[metadata][utm_term]'), 'ghost_pro');
            assert.equal(parsed.get('subscription_data[metadata][utm_content]'), 'header_link');

            return [200, { id: 'cs_123', url: 'https://site.com' }];
          }
          if (uri === '/v1/prices') {
            return [
              200,
              {
                id: 'price_7',
                active: true,
                currency: 'usd',
                unit_amount: 500,
                recurring: {
                  interval: 'month',
                },
              },
            ];
          }

          return [500];
        });

      await membersAgent
        .post('/api/create-stripe-checkout-session/')
        .body({
          customerEmail: 'utm@test.com',
          tierId: paidTier.id,
          cadence: 'month',
          metadata: {
            urlHistory: [
              {
                path: '/pricing',
                time: Date.now(),
                referrerSource: 'google',
                referrerMedium: null,
                referrerUrl: null,
                utmSource: 'newsletter',
                utmMedium: 'email',
                utmCampaign: 'spring_sale',
                utmTerm: 'ghost_pro',
                utmContent: 'header_link',
              },
            ],
          },
        })
        .expectStatus(200)
        .matchBodySnapshot()
        .matchHeaderSnapshot();

      assert.equal(scope.isDone(), true);
    });
  });

  describe('The publisher design', function () {
    const design = {
      button_color: '#ff5a1f',
      background_color: '#ffffff',
      border_style: 'pill',
      font_family: 'roboto_slab',
    };

    beforeEach(function () {
      mockManager.mockStripe();
      mockManager.mockLabsEnabled('stripeCheckoutDesign');
    });

    afterEach(async function () {
      await models.Base.knex('stripe_checkout_config').del();
    });

    async function setDesign(value) {
      await adminAgent
        .put('/stripe/checkout/config/')
        .body({ checkout_config: [{ design: value }] })
        .expectStatus(200);
    }

    // Starts a paid tier checkout and returns the session Ghost sent to Stripe.
    async function startCheckout() {
      const {
        body: { tiers },
      } = await adminAgent.get('/tiers/');
      const paidTier = tiers.find((tier) => tier.type === 'paid');

      await membersAgent
        .post('/api/create-stripe-checkout-session/')
        .body({ tierId: paidTier.id, cadence: 'month' })
        .expectStatus(200);

      return stripeMocker.checkoutSessions.at(-1);
    }

    it('styles the checkout with the publisher design, and only once there is one', async function () {
      assert.equal((await startCheckout()).branding_settings, undefined);

      await setDesign({ customize: true, ...design });
      assert.deepEqual((await startCheckout()).branding_settings, design);

      await setDesign({ customize: false });
      assert.equal((await startCheckout()).branding_settings, undefined);
    });

    it('styles a card update with the publisher design', async function () {
      await setDesign({ customize: true, ...design });
      const member = await models.Member.findOne({ email: 'member1@test.com' }, { require: true });
      const identity = await membersService.api.getMemberIdentityToken(member.get('transient_id'));

      await membersAgent
        .post('/api/create-stripe-update-session/')
        .body({ identity })
        .expectStatus(200);

      const session = stripeMocker.checkoutSessions.at(-1);
      assert.equal(session.mode, 'setup');
      assert.deepEqual(session.branding_settings, design);
    });

    it('sends no design while its flag is off, even when one is saved', async function () {
      await setDesign({ customize: true, ...design });
      mockManager.mockLabsDisabled('stripeCheckoutDesign');

      assert.equal((await startCheckout()).branding_settings, undefined);
    });

    it('goes ahead unstyled when the saved design can no longer be read', async function () {
      await setDesign({ customize: true, ...design });
      await models.Base.knex('stripe_checkout_config').update({
        design: JSON.stringify({ ...design, font_family: 'a_font_stripe_dropped' }),
      });

      assert.equal((await startCheckout()).branding_settings, undefined);
    });
  });

  describe('Shipping address collection', function () {
    let paidTierId;

    beforeEach(async function () {
      mockManager.mockStripe();
      mockManager.mockLabsEnabled('stripeCheckoutCollection');
      mockManager.mockLabsEnabled('membersCustomFields');
      for (const field of [
        { name: 'Delivery address', type: 'address' },
        { name: 'Recipient name', type: 'short_text' },
      ]) {
        await adminAgent
          .post('/members/metafields/custom/')
          .body({ members_metafields: [field] })
          .expectStatus(201);
      }
      const {
        body: { tiers },
      } = await adminAgent.get('/tiers/');
      paidTierId = tiers.find((tier) => tier.type === 'paid').id;
    });

    afterEach(async function () {
      await models.Base.knex('stripe_checkout_config_tiers').del();
      await models.Base.knex('stripe_checkout_config').del();
      await models.Base.knex('members_metafield_bindings').del();
      await models.Base.knex('members_metafields').del();
    });

    async function setShipping(shipping) {
      await adminAgent
        .put('/stripe/checkout/config/')
        .body({ checkout_config: [{ shipping }] })
        .expectStatus(200);
    }

    const collect = (over = {}) => ({
      collect: true,
      address: { custom_field_key: 'delivery_address' },
      name: { custom_field_key: 'recipient_name' },
      ...over,
    });

    // Starts a checkout for the paid tier and returns the session Ghost sent to Stripe.
    async function startCheckout() {
      await membersAgent
        .post('/api/create-stripe-checkout-session/')
        .body({ tierId: paidTierId, cadence: 'month' })
        .expectStatus(200);

      return stripeMocker.checkoutSessions.at(-1);
    }

    it('asks for an address in the named countries', async function () {
      await setShipping(collect({ allowed_countries: ['GB', 'IE'] }));
      assert.deepEqual((await startCheckout()).shipping_address_collection, {
        allowed_countries: ['GB', 'IE'],
      });
    });

    it('offers every country Stripe ships to when none are named', async function () {
      await setShipping(collect());

      // The Stripe mock decodes a list this long as an object keyed by position.
      const countries = Object.values(
        (await startCheckout()).shipping_address_collection.allowed_countries,
      );
      assert.ok(countries.includes('GB'));
      assert.ok(countries.includes('US'));
      assert.ok(countries.length > 200);
    });

    it('keeps asking while only the name field is archived, and stops once the address field is', async function () {
      await setShipping(collect());
      const archive = (key) =>
        adminAgent
          .put(`/members/metafields/custom/${key}/`)
          .body({ members_metafields: [{ status: 'archived' }] })
          .expectStatus(200);

      await archive('recipient_name');
      assert.ok((await startCheckout()).shipping_address_collection);

      await archive('delivery_address');
      assert.equal((await startCheckout()).shipping_address_collection, undefined);
    });
  });

  describe('Phone number collection', function () {
    let paidTierId;

    beforeEach(async function () {
      mockManager.mockStripe();
      mockManager.mockLabsEnabled('stripeCheckoutCollection');
      mockManager.mockLabsEnabled('membersCustomFields');
      await adminAgent
        .post('/members/metafields/custom/')
        .body({ members_metafields: [{ name: 'Contact phone', type: 'short_text' }] })
        .expectStatus(201);
      const {
        body: { tiers },
      } = await adminAgent.get('/tiers/');
      paidTierId = tiers.find((tier) => tier.type === 'paid').id;
    });

    afterEach(async function () {
      await models.Base.knex('stripe_checkout_config_tiers').del();
      await models.Base.knex('stripe_checkout_config').del();
      await models.Base.knex('members_metafield_bindings').del();
      await models.Base.knex('members_metafields').del();
    });

    async function setCheckout(config) {
      await adminAgent
        .put('/stripe/checkout/config/')
        .body({ checkout_config: [config] })
        .expectStatus(200);
    }

    const collect = (over = {}) => ({
      phone: { collect: true, custom_field_key: 'contact_phone', ...over },
    });

    // Starts a checkout for the paid tier and returns the session Ghost sent to Stripe.
    async function startCheckout() {
      await membersAgent
        .post('/api/create-stripe-checkout-session/')
        .body({ tierId: paidTierId, cadence: 'month' })
        .expectStatus(200);

      return stripeMocker.checkoutSessions.at(-1);
    }

    it('stops asking while its field is archived, and so does a preview of it', async function () {
      await setCheckout(collect());
      assert.deepEqual((await startCheckout()).phone_number_collection, { enabled: true });

      await adminAgent
        .put('/members/metafields/custom/contact_phone/')
        .body({ members_metafields: [{ status: 'archived' }] })
        .expectStatus(200);

      assert.equal((await startCheckout()).phone_number_collection, undefined);

      await adminAgent
        .post('/stripe/checkout/preview/')
        .body({
          checkout_preview: [{ tier_id: paidTierId, design: { customize: false }, ...collect() }],
        })
        .expectStatus(200);
      assert.equal(stripeMocker.checkoutSessions.at(-1).phone_number_collection, undefined);
    });

    // A plan without custom fields reads every field as archived, so checkout stops asking
    // for what it saves into one. A tax ID saves into no field, so it is still asked for.
    describe('on a plan without custom fields', function () {
      afterEach(async function () {
        await hostLimits.restoreHostLimits();
      });

      it('stops asking for it while still asking for a tax ID, and asks again once the plan includes it', async function () {
        await setCheckout({ ...collect(), tax_number: { collect: true } });
        await hostLimits.setHostLimits({ limitCustomFields: { disabled: true } });

        const session = await startCheckout();
        assert.equal(session.phone_number_collection, undefined);
        assert.deepEqual(session.tax_id_collection, { enabled: true });

        await hostLimits.restoreHostLimits();
        assert.deepEqual((await startCheckout()).phone_number_collection, { enabled: true });
      });
    });
  });

  describe('Tax ID collection', function () {
    const otherTierId = 'ffffffffffffffffffffffff';
    let paidTierId;
    let stripeCustomerIds;

    beforeEach(async function () {
      mockManager.mockStripe();
      mockManager.mockLabsEnabled('stripeCheckoutCollection');
      // Automatic tax offers a tax ID on every checkout by itself, so it stays off unless a
      // test is about the two together.
      mockManager.mockLabsDisabled('stripeAutomaticTax');
      const {
        body: { tiers },
      } = await adminAgent.get('/tiers/');
      paidTierId = tiers.find((tier) => tier.type === 'paid').id;
      const [existing] = await models.Base.knex('products').where('id', paidTierId);
      await models.Base.knex('products').insert({
        ...existing,
        id: otherTierId,
        name: 'Other tier',
        slug: 'other-tier',
      });
      stripeCustomerIds = await models.Base.knex('members_stripe_customers').pluck('id');
    });

    afterEach(async function () {
      await models.Base.knex('stripe_checkout_config_tiers').del();
      await models.Base.knex('stripe_checkout_config').del();
      await models.Base.knex('products').where('id', otherTierId).del();
      // The Stripe customers made for members who checked out signed in.
      await models.Base.knex('members_stripe_customers').whereNotIn('id', stripeCustomerIds).del();
    });

    async function setTaxNumber(taxNumber) {
      await adminAgent
        .put('/stripe/checkout/config/')
        .body({ checkout_config: [{ tax_number: taxNumber }] })
        .expectStatus(200);
    }

    // Starts a checkout for the paid tier, signed in as a free member when asked to, and
    // returns the session Ghost sent to Stripe. A member checking out signed in always has a
    // Stripe customer, made for them if they had none.
    async function startCheckout({ signedIn = false } = {}) {
      let identity;
      if (signedIn) {
        const member = await models.Member.findOne(
          { email: 'member1@test.com' },
          { require: true },
        );
        identity = await membersService.api.getMemberIdentityToken(member.get('transient_id'));
      }
      await membersAgent
        .post('/api/create-stripe-checkout-session/')
        .body({ tierId: paidTierId, cadence: 'month', identity })
        .expectStatus(200);

      return stripeMocker.checkoutSessions.at(-1);
    }

    it('lets Stripe save the business name on a buyer who is already a customer, as Stripe requires', async function () {
      await setTaxNumber({ collect: true });

      // Stripe refuses to update a customer on a checkout that has none.
      assert.equal((await startCheckout()).customer_update, undefined);

      const session = await startCheckout({ signedIn: true });
      assert.ok(session.customer);
      assert.deepEqual(session.tax_id_collection, { enabled: true });
      assert.deepEqual(session.customer_update, { name: 'auto' });
    });

    it('keeps saving the address automatic tax needs, on every tier', async function () {
      mockManager.mockLabsEnabled('stripeAutomaticTax');
      await setTaxNumber({ collect: true, tier_ids: [paidTierId] });

      const session = await startCheckout({ signedIn: true });
      assert.deepEqual(session.automatic_tax, { enabled: true });
      assert.deepEqual(session.tax_id_collection, { enabled: true });
      assert.deepEqual(session.customer_update, { address: 'auto', name: 'auto' });

      await setTaxNumber({ collect: true, tier_ids: [otherTierId] });
      assert.deepEqual((await startCheckout()).tax_id_collection, { enabled: true });
    });
  });
});
