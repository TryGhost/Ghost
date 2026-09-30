import assert from 'node:assert/strict';

const { agentProvider, fixtureManager, mockManager } = require('../../utils/e2e-framework');
const { stripeMocker } = require('../../utils/e2e-framework-mock-manager');
const models = require('../../../core/server/models');
const membersService = require('../../../core/server/services/members');

const ADDRESS = { line1: '1 High Street', city: 'London', country: 'GB' };

interface Agent {
  get: (_url: string) => any;
  put: (_url: string) => any;
  post: (_url: string) => any;
}

/**
 * What a tier asks of a member arriving on it.
 *
 * Ghost only sends someone through a payment page when they are not already paying, so
 * none of this happens on the page that collects for a new subscriber. Everything here
 * goes through the endpoint a member's own client calls to change plan.
 */
describe('Collecting when a member changes tier', function () {
  let membersAgent: Agent & { loginAs: (_e: string) => Promise<void> };
  let adminAgent: Agent & { loginAsOwner: () => Promise<void> };
  let memberId: string;
  let memberEmail: string;
  let fromTier: { id: string; slug: string };
  let toTier: { id: string; slug: string };
  let addressKey: string;

  async function identity() {
    const member = await models.Member.findOne({ email: memberEmail });
    return membersService.api.getMemberIdentityToken(member.get('transient_id'));
  }

  /**
   * A member of this test's own, because what a tier asks of someone turns on which tiers
   * they already hold. Reusing one would leave every test after the first arriving on a
   * tier it was already on, and being asked for nothing on those grounds.
   */
  async function aFreshMember(): Promise<void> {
    memberEmail = `tier-change-${Date.now()}-${Math.random().toString(16).slice(2)}@test.com`;
    const { body } = await adminAgent
      .post('members/')
      .body({ members: [{ email: memberEmail, name: 'Test Member' }] })
      .expectStatus(201);
    memberId = body.members[0].id;
  }

  async function defineField(name: string, type: string): Promise<string> {
    const { body } = await adminAgent
      .post('members/metafields/custom/')
      .body({ members_metafields: [{ name, type }] })
      .expectStatus(201);
    return body.members_metafields[0].key;
  }

  async function collectShippingOn(tierId: string): Promise<string> {
    const key = await defineField('Delivery address', 'address');
    await adminAgent
      .put(`tiers/${tierId}/checkout_config/`)
      .body({
        tiers_checkout_config: [
          {
            shipping: {
              collect: true,
              allowed_countries: ['GB'],
              name: { custom_field_key: 'shipping_name' },
              address: { custom_field_key: key },
            },
          },
        ],
      })
      .expectStatus(200);
    return key;
  }

  /**
   * Put the member on a paid tier, the way an existing paying member arrives here.
   */
  async function startPayingFor(tier: { slug: string }): Promise<string> {
    const price = await stripeMocker.getPriceForTier(tier.slug, 'month');
    await adminAgent
      .post(`members/${memberId}/subscriptions/`)
      .body({ stripe_price_id: price.id })
      .expectStatus(200);

    const { body } = await adminAgent.get(`members/${memberId}/`).expectStatus(200);
    assert.equal(body.members[0].status, 'paid', 'the member is paying before the change');
    return body.members[0].subscriptions[0].id;
  }

  async function changeTier(subscriptionId: string, tierId: string, body: object = {}) {
    return membersAgent
      .put(`/api/subscriptions/${subscriptionId}/`)
      .body({ identity: await identity(), tierId, cadence: 'month', ...body });
  }

  async function heldByMember() {
    const { body } = await adminAgent.get(`members/${memberId}/`).expectStatus(200);
    return body.members[0].metafields?.custom ?? {};
  }

  beforeAll(async function () {
    ({ membersAgent, adminAgent } = await agentProvider.getAgentsForMembers());
    await fixtureManager.init('members', 'tiers:extra');
    await adminAgent.loginAsOwner();

    // Mocked once for the whole file, not per test. Resetting the mocked Stripe between
    // tests would empty its prices while Ghost's own tables went on naming them, and the
    // next tier change would be asked to switch to a price nothing had issued.
    mockManager.mockStripe();
    mockManager.mockMail();
    mockManager.mockLabsEnabled('stripeCheckoutCollection');
    mockManager.mockLabsEnabled('membersCustomFields');

    const { body } = await adminAgent.get('tiers/?limit=all');
    [fromTier, toTier] = body.tiers.filter((tier: { type: string }) => tier.type === 'paid');
  });

  afterAll(async function () {
    await mockManager.restore();
  });

  beforeEach(async function () {
    await aFreshMember();
    addressKey = await collectShippingOn(toTier.id);
  });

  afterEach(async function () {
    await models.Base.knex('members_metafield_values').del();
    await models.Base.knex('products_checkout_fields').del();
    await models.Base.knex('products_checkout_config').del();
    await models.Base.knex('members_metafield_bindings').del();
    await models.Base.knex('members_metafields').del();
  });

  it('stores what the member supplied for the tier they moved onto', async function () {
    const subscriptionId = await startPayingFor(fromTier);

    await changeTier(subscriptionId, toTier.id, {
      collected: { shipping: { name: 'Bex Jones', address: ADDRESS } },
    }).then((res: { statusCode: number }) => assert.equal(res.statusCode, 204));

    const held = await heldByMember();
    assert.deepEqual(held[addressKey], ADDRESS, 'the address landed in the field the tier names');
    assert.equal(held.shipping_name, 'Bex Jones');
  });

  it('records the member as the source, not the routing', async function () {
    const subscriptionId = await startPayingFor(fromTier);

    await changeTier(subscriptionId, toTier.id, {
      collected: { shipping: { name: 'Bex Jones', address: ADDRESS } },
    });

    // A member typing their own address is answerable for it in a way no routing is, and
    // this is the difference between a value they gave and one a payment page collected.
    const written = await models.Base.knex('members_metafield_values')
      .where('member_id', memberId)
      .distinct('written_by_type')
      .pluck('written_by_type');
    assert.deepEqual(written, ['member']);
  });

  it('refuses the change when the tier needs something nobody supplied', async function () {
    const subscriptionId = await startPayingFor(fromTier);

    const { statusCode } = await changeTier(subscriptionId, toTier.id);

    assert.equal(statusCode, 422);
    // The plan did not change either. A member paying for a tier that ships something,
    // with nowhere to ship it, is the outcome this exists to prevent.
    assert.deepEqual(await heldByMember(), {});
  });

  it('asks nothing of a member who already holds what the tier needs', async function () {
    // Both, because collecting a shipping address collects a recipient too: a parcel
    // needs someone to be addressed to, and the tier binds the two together.
    await adminAgent
      .put(`members/${memberId}/`)
      .body({
        members: [
          { metafields: { custom: { [addressKey]: ADDRESS, shipping_name: 'Bex Jones' } } },
        ],
      })
      .expectStatus(200);

    const subscriptionId = await startPayingFor(fromTier);

    // Carried through rather than demanded twice, which is the whole point of knowing
    // where a collected value lands.
    const { statusCode } = await changeTier(subscriptionId, toTier.id);

    assert.equal(statusCode, 204);
  });

  it('asks nothing when the tier collects nothing', async function () {
    const subscriptionId = await startPayingFor(toTier);

    const { statusCode } = await changeTier(subscriptionId, fromTier.id);

    assert.equal(statusCode, 204);
  });

  it('asks nothing of a member changing cadence on the tier they hold', async function () {
    const subscriptionId = await startPayingFor(toTier);

    // Already on the collecting tier and holding nothing for it, because they were never
    // asked. Moving from monthly to yearly is not arriving anywhere new, so it is not the
    // moment to start demanding an address.
    const { statusCode } = await membersAgent
      .put(`/api/subscriptions/${subscriptionId}/`)
      .body({ identity: await identity(), tierId: toTier.id, cadence: 'year' });

    assert.equal(statusCode, 204);
  });
});
