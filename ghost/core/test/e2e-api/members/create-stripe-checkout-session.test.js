const assert = require('node:assert/strict');
const querystring = require('querystring');
const {
  agentProvider,
  mockManager,
  fixtureManager,
  matchers,
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

  it('Does not allow an unauthenticated request to create a checkout session for an existing free member', async function () {
    const {
      body: { tiers },
    } = await adminAgent.get('/tiers/?include=monthly_price&yearly_price');

    const paidTier = tiers.find((tier) => tier.type === 'paid');

    await membersAgent
      .post('/api/create-stripe-checkout-session/')
      .body({
        customerEmail: 'member1@test.com',
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
});
