const assert = require('node:assert/strict');
const {
  agentProvider,
  fixtureManager,
  matchers,
  mockManager,
} = require('../../utils/e2e-framework');
const models = require('../../../core/server/models');

describe('Tiers Content API', function () {
  let agent;

  beforeAll(async function () {
    agent = await agentProvider.getContentAPIAgent();
    await fixtureManager.init('members', 'api_keys', 'tiers:archived', 'tiers:hidden');
    await agent.authenticate();
  });

  // Stated rather than assumed. A tier carries what it asks a member for only where that
  // feature is on, so these say which world they are describing instead of recording
  // whatever the environment happened to have enabled.
  beforeEach(function () {
    mockManager.mockLabsDisabled('stripeCheckoutCollection');
  });

  afterEach(function () {
    mockManager.restore();
  });

  it('Can request only active tiers', async function () {
    await agent
      .get('/tiers/?include=monthly_price')
      .expectStatus(200)
      .matchHeaderSnapshot({
        'content-version': matchers.anyContentVersion,
        etag: matchers.anyEtag,
      })
      .matchBodySnapshot({
        tiers: Array(3).fill({
          id: matchers.anyObjectId,
          created_at: matchers.anyISODate,
          updated_at: matchers.anyISODate,
        }),
      });
  });

  it('Can filter on visibility', async function () {
    await agent
      .get('/tiers/?filter=visibility:public')
      .expectStatus(200)
      .matchHeaderSnapshot({
        'content-version': matchers.anyContentVersion,
        etag: matchers.anyEtag,
      })
      .matchBodySnapshot({
        tiers: Array(2).fill({
          id: matchers.anyObjectId,
          created_at: matchers.anyISODate,
          updated_at: matchers.anyISODate,
        }),
      });
  });
});

// What a tier asks a member for, carried by the tier itself. A themed pricing or
// plan-change page reads tiers through this API and cannot reach a members-only one, so
// this is the only place the answer can reach one.
describe('Tier requirements Content API', function () {
  let contentAgent;
  let adminAgent;
  let paidTier;
  let otherTier;

  async function defineField(name, type) {
    const { body } = await adminAgent
      .post('members/metafields/custom/')
      .body({ members_metafields: [{ name, type }] })
      .expectStatus(201);
    return body.members_metafields[0].key;
  }

  async function collectShipping(tierId, allowedCountries) {
    const address = await defineField('Delivery address', 'address');
    await adminAgent
      .put(`tiers/${tierId}/checkout_config/`)
      .body({
        tiers_checkout_config: [
          {
            shipping: {
              collect: true,
              ...(allowedCountries ? { allowed_countries: allowedCountries } : {}),
              name: { custom_field_key: 'shipping_name' },
              address: { custom_field_key: address },
            },
          },
        ],
      })
      .expectStatus(200);
    return address;
  }

  async function readTiers() {
    const { body } = await contentAgent.get('/tiers/').expectStatus(200);
    return body.tiers;
  }

  const find = (tiers, id) => tiers.find((tier) => tier.id === id);

  beforeAll(async function () {
    contentAgent = await agentProvider.getContentAPIAgent();
    adminAgent = await agentProvider.getAdminAPIAgent();
    await fixtureManager.init('members', 'api_keys', 'tiers:extra');
    await contentAgent.authenticate();
    await adminAgent.loginAsOwner();

    const { body } = await adminAgent.get('tiers/?limit=all');
    [paidTier, otherTier] = body.tiers.filter((tier) => tier.type === 'paid');
  });

  beforeEach(function () {
    mockManager.mockLabsEnabled('stripeCheckoutCollection');
    mockManager.mockLabsEnabled('membersCustomFields');
  });

  afterEach(async function () {
    await models.Base.knex('products_checkout_fields').del();
    await models.Base.knex('products_checkout_config').del();
    await models.Base.knex('members_metafield_bindings').del();
    await models.Base.knex('members_metafields').del();
    mockManager.restore();
  });

  it('says what a tier asks for, on the tier', async function () {
    await collectShipping(paidTier.id, ['GB', 'IE']);

    const tiers = await readTiers();

    assert.deepEqual(find(tiers, paidTier.id).requirements, {
      shipping: { collect: true, allowed_countries: ['GB', 'IE'] },
    });
  });

  it('says a tier asks for nothing rather than staying silent', async function () {
    await collectShipping(paidTier.id, ['GB']);

    const tiers = await readTiers();

    // Empty rather than absent, so a client tells "this tier wants nothing" apart from
    // "this Ghost cannot tell you" without looking at anything but the key.
    assert.deepEqual(find(tiers, otherTier.id).requirements, {});
  });

  it('leaves the countries out when a tier ships anywhere', async function () {
    await collectShipping(paidTier.id, null);

    const tiers = await readTiers();

    // Ghost stores "everywhere" as no countries at all, and the tier still says it
    // collects, so an absent list cannot be read as shipping nowhere.
    assert.deepEqual(find(tiers, paidTier.id).requirements.shipping, { collect: true });
  });

  it('never names the field a value is kept in', async function () {
    const address = await collectShipping(paidTier.id, ['GB']);

    const answer = JSON.stringify(await readTiers());

    // A member supplies a delivery address, not a value for a field. Where it lands is
    // the publisher's business, and naming it would invite a client to write there.
    assert.ok(!answer.includes(address), 'the destination field is not named');
    assert.ok(!answer.includes('shipping_name'), 'nor the one the recipient name goes into');
  });

  it('says nothing at all on a site without the feature', async function () {
    await collectShipping(paidTier.id, ['GB']);
    mockManager.mockLabsDisabled('stripeCheckoutCollection');

    const tiers = await readTiers();

    // Absent rather than empty: a Ghost that does not do this should not imply every
    // tier asks for nothing, which is a different claim.
    assert.equal(Object.hasOwn(find(tiers, paidTier.id), 'requirements'), false);
  });
});
