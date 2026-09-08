import assert from 'node:assert/strict';

const { agentProvider, fixtureManager, mockManager } = require('../../utils/e2e-framework');
const models = require('../../../core/server/models');

interface Agent {
  get: (_url: string) => any;
  put: (_url: string) => any;
  post: (_url: string) => any;
}

interface MembersAgent extends Agent {
  loginAs: (_email: string) => Promise<void>;
  duplicate: () => MembersAgent;
}

interface AdminAgent extends Agent {
  loginAsOwner: () => Promise<void>;
}

const MEMBER_EMAIL = 'member1@test.com';

/**
 * What a tier will ask a member for, read by the member who is about to be asked.
 *
 * Everything here is set up through the Admin API, the way a publisher sets it up, and
 * read through the members API, the way a member's client reads it. Nothing touches a
 * table, so none of it is pinned to how these settings happen to be stored.
 */
describe('Tier checkout requirements Members API', function () {
  let adminAgent: AdminAgent;
  let membersAgent: MembersAgent;
  let paidTier: { id: string };
  let secondTier: { id: string };

  async function defineField(name: string, type: string): Promise<string> {
    const { body } = await adminAgent
      .post('members/metafields/custom/')
      .body({ members_metafields: [{ name, type }] })
      .expectStatus(201);
    return body.members_metafields[0].key;
  }

  async function collectInto(tierId: string, body: Record<string, unknown>): Promise<void> {
    await adminAgent
      .put(`tiers/${tierId}/checkout_config/`)
      .body({ tiers_checkout_config: [body] })
      .expectStatus(200);
  }

  async function readRequirements() {
    const { body } = await membersAgent.get('/api/tiers/checkout_requirements/').expectStatus(200);
    return body.tiers_checkout_requirements;
  }

  beforeAll(async function () {
    ({ adminAgent, membersAgent } = await agentProvider.getAgentsForMembers());
    await fixtureManager.init('members', 'tiers:extra');
    await adminAgent.loginAsOwner();
    await membersAgent.loginAs(MEMBER_EMAIL);
  });

  beforeEach(async function () {
    mockManager.mockLabsEnabled('stripeCheckoutCollection');
    mockManager.mockLabsEnabled('membersCustomFields');

    const { body } = await adminAgent.get('tiers/?limit=all');
    [paidTier, secondTier] = body.tiers.filter((tier: { type: string }) => tier.type === 'paid');
  });

  afterEach(async function () {
    await models.Base.knex('products_checkout_fields').del();
    await models.Base.knex('products_checkout_config').del();
    await models.Base.knex('members_metafield_bindings').del();
    await models.Base.knex('members_metafields').del();
    mockManager.restore();
  });

  it('says nothing when no tier collects anything', async function () {
    assert.deepEqual(await readRequirements(), []);
  });

  it('names the tiers that collect, and what they collect', async function () {
    const address = await defineField('Delivery address', 'address');
    const phone = await defineField('Contact number', 'short_text');

    await collectInto(paidTier.id, {
      shipping: {
        collect: true,
        allowed_countries: ['GB', 'IE'],
        name: { custom_field_key: 'shipping_name' },
        address: { custom_field_key: address },
      },
      phone: { collect: true, custom_field_key: phone },
    });

    assert.deepEqual(await readRequirements(), [
      {
        tier_id: paidTier.id,
        shipping: { collect: true, allowed_countries: ['GB', 'IE'] },
        phone: { collect: true },
      },
    ]);
  });

  it('leaves the countries out when a tier ships anywhere', async function () {
    const address = await defineField('Delivery address', 'address');

    await collectInto(paidTier.id, {
      shipping: {
        collect: true,
        name: { custom_field_key: 'shipping_name' },
        address: { custom_field_key: address },
      },
    });

    const [tier] = await readRequirements();
    // Ghost stores "everywhere" as no countries at all, so an absent list is the answer
    // rather than every country the processor happens to ship to today. The tier still
    // says it collects, so an absent list cannot be read as collecting nowhere.
    assert.deepEqual(tier.shipping, { collect: true });
  });

  it('says nothing about a tier that only collects a tax number', async function () {
    // The processor keeps a tax number against the customer it invoices and Ghost never
    // stores one, so there is nothing a member could be asked for here.
    await collectInto(paidTier.id, { tax_number: { collect: true } });

    assert.deepEqual(await readRequirements(), []);
  });

  it('answers for a tier the member is not on', async function () {
    // The whole point: a member reads this to decide whether to move onto a tier, so an
    // answer that depended on already holding it would be useless.
    const address = await defineField('Delivery address', 'address');
    await collectInto(secondTier.id, {
      shipping: {
        collect: true,
        allowed_countries: ['GB'],
        name: { custom_field_key: 'shipping_name' },
        address: { custom_field_key: address },
      },
    });

    const required = await readRequirements();
    assert.deepEqual(
      required.map((tier: { tier_id: string }) => tier.tier_id),
      [secondTier.id],
    );
  });

  it('never names the fields a value is kept in', async function () {
    // A member supplies a delivery address, not a value for a field. Where it lands is
    // the publisher's business, and naming it here would invite a client to write there
    // directly.
    const address = await defineField('Delivery address', 'address');
    await collectInto(paidTier.id, {
      shipping: {
        collect: true,
        name: { custom_field_key: 'shipping_name' },
        address: { custom_field_key: address },
      },
    });

    const answer = JSON.stringify(await readRequirements());
    assert.ok(!answer.includes(address), 'the destination field is not named');
    assert.ok(!answer.includes('shipping_name'), 'nor the one the name goes into');
  });

  // Three different nothings, and a client has to tell them apart. A site with the
  // feature turned off has no such endpoint; a site that has it but collects nowhere
  // answers with an empty list; a tier that collects nothing is simply not in it.
  it('does not exist on a site without the feature', async function () {
    mockManager.mockLabsDisabled('stripeCheckoutCollection');

    const { statusCode } = await membersAgent.get('/api/tiers/checkout_requirements/');

    assert.equal(statusCode, 404);
  });

  it('will not tell someone who is not signed in', async function () {
    const address = await defineField('Delivery address', 'address');
    await collectInto(paidTier.id, {
      shipping: {
        collect: true,
        name: { custom_field_key: 'shipping_name' },
        address: { custom_field_key: address },
      },
    });

    const signedOut = membersAgent.duplicate();
    const { statusCode, body } = await signedOut.get('/api/tiers/checkout_requirements/');

    assert.equal(statusCode, 401);
    assert.equal(Object.hasOwn(body, 'tiers_checkout_requirements'), false);
  });
});
