const assert = require('node:assert/strict');
const querystring = require('querystring');
const {
  agentProvider,
  mockManager,
  fixtureManager,
  matchers,
} = require('../../utils/e2e-framework');
const nock = require('nock');
const { STRIPE_ALLOWED_COUNTRIES } = require('@tryghost/checkout');
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
  // What a tier's checkout configuration actually puts on the wire. The parameters
  // themselves are settled next to the builder; what is proven here is the whole chain —
  // a publisher's configuration reaching Stripe through the payment link.
  describe("Collecting a tier's checkout fields", function () {
    let paidTier;

    function mockStripe(captureSessionBody) {
      nock('https://api.stripe.com')
        .persist()
        .get(/v1\/.*/)
        .reply((uri) => {
          const [match, resource, id] = uri.match(/\/v1\/(\w+)\/(.+)\/?/) || [null];
          if (match && resource === 'products') {
            return [200, { id, active: true }];
          }
          if (match && resource === 'prices') {
            return [
              200,
              {
                id,
                active: true,
                currency: 'usd',
                unit_amount: 500,
                recurring: { interval: 'month' },
              },
            ];
          }
          // A signed-in checkout looks its member's customer up before creating a
          // session, which is the whole difference between it and an anonymous one.
          if (match && resource === 'customers') {
            return [
              200,
              { id: id.split('?')[0], email: 'member1@test.com', subscriptions: { data: [] } },
            ];
          }
          return [500];
        });

      nock('https://api.stripe.com')
        .persist()
        .post(/v1\/.*/)
        .reply((uri, body) => {
          if (uri === '/v1/checkout/sessions') {
            captureSessionBody(querystring.parse(body));
            return [200, { id: 'cs_123', url: 'https://site.com' }];
          }
          if (uri === '/v1/prices') {
            return [
              200,
              {
                id: 'price_1',
                active: true,
                currency: 'usd',
                unit_amount: 500,
                recurring: { interval: 'month' },
              },
            ];
          }
          if (uri === '/v1/customers') {
            return [
              200,
              { id: 'cus_signed_in', email: 'member1@test.com', subscriptions: { data: [] } },
            ];
          }
          return [500];
        });
    }

    async function startCheckout() {
      let sessionBody;
      mockStripe((body) => {
        sessionBody = body;
      });

      await membersAgent
        .post('/api/create-stripe-checkout-session/')
        .body({ tierId: paidTier.id, cadence: 'month' })
        .expectStatus(200);

      return sessionBody;
    }

    beforeEach(async function () {
      // The tests above register persistent interceptors and never clean them up, so
      // one of theirs would answer these requests and the body would never be seen.
      nock.cleanAll();
      mockManager.mockLabsEnabled('stripeCheckoutCollection');
      const {
        body: { tiers },
      } = await adminAgent.get('/tiers/?include=monthly_price&yearly_price');
      paidTier = tiers.find((tier) => tier.type === 'paid');
    });

    afterEach(async function () {
      nock.cleanAll();
      await models.Base.knex('products_checkout_fields').del();
      await models.Base.knex('products_checkout_config').del();
      await models.Base.knex('members_custom_field_bindings').del();
      await models.Base.knex('members_custom_fields').del();
    });

    it('asks Stripe for the questions and the collection a tier configured', async function () {
      const {
        body: {
          members_metafields: [question],
        },
      } = await adminAgent
        .post('/members/metafields/custom/')
        .body({ members_metafields: [{ name: 'T-shirt size', type: 'short_text' }] });
      const {
        body: {
          members_metafields: [address],
        },
      } = await adminAgent
        .post('/members/metafields/custom/')
        .body({ members_metafields: [{ name: 'Delivery address', type: 'address' }] });

      await adminAgent.put(`/tiers/${paidTier.id}/checkout_config/`).body({
        tiers_checkout_config: [
          {
            custom_fields: [{ key: question.key }],
            shipping: {
              collect: true,
              allowed_countries: ['GB', 'IE'],
              name: { custom_field_key: 'shipping_name' },
              address: { custom_field_key: address.key },
            },
          },
        ],
      });

      const sessionBody = await startCheckout();

      // Form-encoded, so Stripe's nested parameters arrive as bracketed keys. Our own
      // field key is what goes out, which is what makes reading the answer a lookup.
      assert.equal(sessionBody['custom_fields[0][key]'], 't_shirt_size');
      assert.equal(sessionBody['custom_fields[0][label][custom]'], 'T-shirt size');
      assert.equal(sessionBody['custom_fields[0][type]'], 'text');
      assert.equal(sessionBody['shipping_address_collection[allowed_countries][0]'], 'GB');
      assert.equal(sessionBody['shipping_address_collection[allowed_countries][1]'], 'IE');
    });

    // Ghost stores "everywhere" as no countries at all, and Stripe has no way to say that:
    // `allowed_countries` is the only key `shipping_address_collection` has, so a request
    // that leaves it out carries no parameter, and Stripe creates a session that succeeds
    // and collects no address. Measured against the live API, not read from the reference,
    // which calls the list optional. So the expansion has to happen before the request —
    // and this is what proves it did.
    it('asks Stripe for every country when a tier delivers everywhere', async function () {
      const {
        body: {
          members_metafields: [address],
        },
      } = await adminAgent
        .post('/members/metafields/custom/')
        .body({ members_metafields: [{ name: 'Delivery address', type: 'address' }] });

      await adminAgent.put(`/tiers/${paidTier.id}/checkout_config/`).body({
        tiers_checkout_config: [
          {
            shipping: {
              collect: true,
              name: { custom_field_key: 'shipping_name' },
              address: { custom_field_key: address.key },
            },
          },
        ],
      });

      const sessionBody = await startCheckout();

      const sent = Object.keys(sessionBody).filter((key) =>
        key.startsWith('shipping_address_collection[allowed_countries]'),
      );
      assert.equal(
        sent.length,
        STRIPE_ALLOWED_COUNTRIES.length,
        'a tier that delivers everywhere has to name every country Stripe ships to',
      );
      assert.equal(sessionBody['shipping_address_collection[allowed_countries][0]'], 'AC');
    });

    // The safety property: a site that configured nothing sends what it always sent.
    //
    // `tax_id_collection` is excluded because automatic tax already sets it on this
    // fixture, which is the point — the two have to agree on that parameter rather than
    // one of them owning it. `customer_update` is the parameter that took checkout down
    // in 2024, and nothing here may be a new way to reach it.
    it('asks for nothing when the tier configured nothing', async function () {
      const sessionBody = await startCheckout();

      const collectionKeys = Object.keys(sessionBody).filter(
        (key) =>
          key.startsWith('custom_fields') ||
          key.startsWith('shipping_address_collection') ||
          key.startsWith('phone_number_collection') ||
          key.startsWith('customer_update'),
      );
      assert.deepEqual(collectionKeys, []);
    });

    it('asks Stripe for a tax number and a phone number when a tier collects them', async function () {
      const {
        body: {
          members_metafields: [phone],
        },
      } = await adminAgent
        .post('/members/metafields/custom/')
        .body({ members_metafields: [{ name: 'Phone', type: 'short_text' }] });

      await adminAgent.put(`/tiers/${paidTier.id}/checkout_config/`).body({
        tiers_checkout_config: [
          {
            tax_number: { collect: true },
            phone: { collect: true, custom_field_key: phone.key },
          },
        ],
      });

      const sessionBody = await startCheckout();

      assert.equal(sessionBody['tax_id_collection[enabled]'], 'true');
      assert.equal(sessionBody['phone_number_collection[enabled]'], 'true');
    });

    // Every limit is applied again at session-build time rather than trusted from the
    // settings screen. A configuration written while the rules were laxer, or a field
    // renamed longer since, must cost that one question rather than the whole checkout:
    // a rejected session create is a publisher who cannot sell.
    it('drops a question renamed longer than a checkout will render, and still sells', async function () {
      const {
        body: {
          members_metafields: [asked],
        },
      } = await adminAgent
        .post('/members/metafields/custom/')
        .body({ members_metafields: [{ name: 'T-shirt size', type: 'short_text' }] });
      const {
        body: {
          members_metafields: [kept],
        },
      } = await adminAgent
        .post('/members/metafields/custom/')
        .body({ members_metafields: [{ name: 'Nickname', type: 'short_text' }] });

      await adminAgent.put(`/tiers/${paidTier.id}/checkout_config/`).body({
        tiers_checkout_config: [{ custom_fields: [{ key: asked.key }, { key: kept.key }] }],
      });

      // Renaming a field does not revisit the checkouts that ask for it, which is how
      // an unaskable question comes to exist without anyone writing one.
      await adminAgent
        .put(`/members/metafields/custom/${asked.key}/`)
        .body({
          members_metafields: [
            {
              name: `A question far longer than a payment page will ever render ${'x'.repeat(20)}`,
            },
          ],
        })
        .expectStatus(200);

      const sessionBody = await startCheckout();

      assert.equal(sessionBody['custom_fields[0][key]'], 'nickname');
      assert.equal(sessionBody['custom_fields[1][key]'], undefined);
    });

    // Archiving is reversible, so the configuration stays and stops being acted on.
    // Whether a field is still active is decided by the join that reads it, so these
    // pin what that join is for.
    it('stops asking a question whose field was archived, and keeps the rest', async function () {
      const {
        body: {
          members_metafields: [archived],
        },
      } = await adminAgent
        .post('/members/metafields/custom/')
        .body({ members_metafields: [{ name: 'T-shirt size', type: 'short_text' }] });
      const {
        body: {
          members_metafields: [kept],
        },
      } = await adminAgent
        .post('/members/metafields/custom/')
        .body({ members_metafields: [{ name: 'Nickname', type: 'short_text' }] });

      await adminAgent.put(`/tiers/${paidTier.id}/checkout_config/`).body({
        tiers_checkout_config: [{ custom_fields: [{ key: archived.key }, { key: kept.key }] }],
      });

      await adminAgent
        .put(`/members/metafields/custom/${archived.key}/`)
        .body({ members_metafields: [{ status: 'archived' }] })
        .expectStatus(200);

      const sessionBody = await startCheckout();

      assert.equal(sessionBody['custom_fields[0][key]'], 'nickname');
      assert.equal(sessionBody['custom_fields[1][key]'], undefined);
    });

    // Each destination drops out on its own. Neither of the two behind the shipping
    // toggle is privileged: whichever is still active is why the step is worth asking
    // for, and the other simply goes unkept.
    it('keeps asking for shipping while either destination is still active', async function () {
      const {
        body: {
          members_metafields: [recipient],
        },
      } = await adminAgent
        .post('/members/metafields/custom/')
        .body({ members_metafields: [{ name: 'Recipient name', type: 'short_text' }] });
      const {
        body: {
          members_metafields: [address],
        },
      } = await adminAgent
        .post('/members/metafields/custom/')
        .body({ members_metafields: [{ name: 'Delivery address', type: 'address' }] });

      await adminAgent.put(`/tiers/${paidTier.id}/checkout_config/`).body({
        tiers_checkout_config: [
          {
            shipping: {
              collect: true,
              allowed_countries: ['GB'],
              name: { custom_field_key: recipient.key },
              address: { custom_field_key: address.key },
            },
          },
        ],
      });

      // The address is the obvious half, so archiving it is the case that would break
      // if the rule keyed off it rather than off anything landing.
      await adminAgent
        .put(`/members/metafields/custom/${address.key}/`)
        .body({ members_metafields: [{ status: 'archived' }] })
        .expectStatus(200);

      const sessionBody = await startCheckout();
      assert.equal(sessionBody['shipping_address_collection[allowed_countries][0]'], 'GB');
    });

    // Stripe returns the recipient and the address under one parameter, so what makes
    // asking worthwhile is that *something* it returns still has somewhere to land.
    async function collectShippingThenArchive(archived) {
      const {
        body: {
          members_metafields: [address],
        },
      } = await adminAgent
        .post('/members/metafields/custom/')
        .body({ members_metafields: [{ name: 'Delivery address', type: 'address' }] });

      await adminAgent.put(`/tiers/${paidTier.id}/checkout_config/`).body({
        tiers_checkout_config: [
          {
            shipping: {
              collect: true,
              allowed_countries: ['GB'],
              name: { custom_field_key: 'shipping_name' },
              address: { custom_field_key: address.key },
            },
          },
        ],
      });

      for (const key of archived) {
        await adminAgent
          .put(`/members/metafields/custom/${key === 'address' ? address.key : key}/`)
          .body({ members_metafields: [{ status: 'archived' }] })
          .expectStatus(200);
      }
    }

    it('goes on collecting while one destination is left', async function () {
      // The recipient's name is kept in the field Ghost provisioned when the collection
      // was turned on, and that field is still active, so the ask stands and the address
      // is what gets thrown away.
      await collectShippingThenArchive(['address']);

      const sessionBody = await startCheckout();
      assert.equal(sessionBody['shipping_address_collection[allowed_countries][0]'], 'GB');
    });

    it('stops collecting once no destination is left', async function () {
      await collectShippingThenArchive(['address', 'shipping_name']);

      // Collecting an address to throw it away is worse than not asking for one.
      const sessionBody = await startCheckout();
      assert.deepEqual(
        Object.keys(sessionBody).filter((key) => key.startsWith('shipping_address_collection')),
        [],
      );
    });

    // Every signed-in checkout carries a Stripe customer — a free member upgrading, or
    // anyone buying a second time — and that is the combination the rest of these tests
    // never reach, because they all check out anonymously. Stripe requires
    // `customer_update` alongside an existing customer for automatic tax, which is why
    // `_applyAutomaticTaxSessionOptions` sets it only when there is one. If the same
    // holds for collection, turning shipping on breaks checkout for exactly the members
    // most likely to buy. Whether it does is measured by `pnpm stripe:probe`; what this
    // pins is that the path is exercised at all.
    it('collects for a member who already has a Stripe customer', async function () {
      const {
        body: {
          members_metafields: [address],
        },
      } = await adminAgent
        .post('/members/metafields/custom/')
        .body({ members_metafields: [{ name: 'Delivery address', type: 'address' }] });

      await adminAgent.put(`/tiers/${paidTier.id}/checkout_config/`).body({
        tiers_checkout_config: [
          {
            shipping: {
              collect: true,
              allowed_countries: ['GB'],
              name: { custom_field_key: 'shipping_name' },
              address: { custom_field_key: address.key },
            },
          },
        ],
      });

      let sessionBody;
      mockStripe((body) => {
        sessionBody = body;
      });

      const member = await models.Member.findOne({ email: 'member1@test.com' });
      const identity = await membersService.api.getMemberIdentityToken(member.get('transient_id'));

      await membersAgent
        .post('/api/create-stripe-checkout-session/')
        .body({ identity, tierId: paidTier.id, cadence: 'month' })
        .expectStatus(200);

      // The customer is what makes this different from every other collection test.
      assert.ok(sessionBody.customer, 'a signed-in checkout carries a customer');
      assert.equal(sessionBody['shipping_address_collection[allowed_countries][0]'], 'GB');
    });

    // Stripe will not collect a tax id for a customer it may not rename, so a signed-in
    // member could not buy a tier that collects a tax number until Ghost sent the pair.
    // Every other collection test here checks out anonymously and would miss it.
    it('lets a member with a customer buy a tier that collects a tax number', async function () {
      await adminAgent
        .put(`/tiers/${paidTier.id}/checkout_config/`)
        .body({
          tiers_checkout_config: [
            {
              tax_number: { collect: true },
            },
          ],
        })
        .expectStatus(200);

      // Automatic tax asks for the same pairing, and is on by default here, so it would
      // satisfy this whatever collection did. Off, the assertion is about collection.
      mockManager.mockLabsDisabled('stripeAutomaticTax');

      let sessionBody;
      mockStripe((body) => {
        sessionBody = body;
      });

      const member = await models.Member.findOne({ email: 'member1@test.com' });
      const identity = await membersService.api.getMemberIdentityToken(member.get('transient_id'));

      await membersAgent
        .post('/api/create-stripe-checkout-session/')
        .body({ identity, tierId: paidTier.id, cadence: 'month' })
        .expectStatus(200);

      assert.ok(sessionBody.customer, 'a signed-in checkout carries a customer');
      assert.equal(sessionBody['tax_id_collection[enabled]'], 'true');
      assert.equal(sessionBody['customer_update[name]'], 'auto');
    });

    // Both automatic tax and collection write `customer_update`, so the second one to run
    // must add to it rather than replace it. Assigning would drop the address automatic
    // tax needs, and break tax calculation on a site that had it working.
    it('keeps what automatic tax asks for when a tier also collects a tax number', async function () {
      await adminAgent
        .put(`/tiers/${paidTier.id}/checkout_config/`)
        .body({
          tiers_checkout_config: [
            {
              tax_number: { collect: true },
            },
          ],
        })
        .expectStatus(200);

      let sessionBody;
      mockStripe((body) => {
        sessionBody = body;
      });

      const member = await models.Member.findOne({ email: 'member1@test.com' });
      const identity = await membersService.api.getMemberIdentityToken(member.get('transient_id'));

      await membersAgent
        .post('/api/create-stripe-checkout-session/')
        .body({ identity, tierId: paidTier.id, cadence: 'month' })
        .expectStatus(200);

      assert.equal(sessionBody['customer_update[address]'], 'auto');
      assert.equal(sessionBody['customer_update[name]'], 'auto');
    });

    // `customer_update` is only valid alongside `customer`, and sending it without one
    // is the exact shape that took the automatic tax beta down. Collection asks for it
    // only for tax, and only once there is a customer to update.
    it('never sends customer_update for a checkout without a customer', async function () {
      const {
        body: {
          members_metafields: [address],
        },
      } = await adminAgent
        .post('/members/metafields/custom/')
        .body({ members_metafields: [{ name: 'Delivery address', type: 'address' }] });

      await adminAgent
        .put(`/tiers/${paidTier.id}/checkout_config/`)
        .body({
          tiers_checkout_config: [
            {
              shipping: {
                collect: true,
                allowed_countries: ['GB'],
                name: { custom_field_key: 'shipping_name' },
                address: { custom_field_key: address.key },
              },
            },
          ],
        })
        .expectStatus(200);

      const sessionBody = await startCheckout();

      assert.deepEqual(
        Object.keys(sessionBody).filter((key) => key.startsWith('customer_update')),
        [],
      );
    });

    // Turning the collection flag off has to stop the checkout asking, without anyone
    // unpicking the configuration first.
    it('asks for nothing with the flag off, however the tier is configured', async function () {
      const {
        body: {
          members_metafields: [question],
        },
      } = await adminAgent
        .post('/members/metafields/custom/')
        .body({ members_metafields: [{ name: 'T-shirt size', type: 'short_text' }] });
      await adminAgent
        .put(`/tiers/${paidTier.id}/checkout_config/`)
        .body({ tiers_checkout_config: [{ custom_fields: [{ key: question.key }] }] });

      mockManager.mockLabsDisabled('stripeCheckoutCollection');
      const sessionBody = await startCheckout();

      assert.deepEqual(
        Object.keys(sessionBody).filter((key) => key.startsWith('custom_fields')),
        [],
      );
    });
  });
});
