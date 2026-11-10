import assert from 'node:assert/strict';

const { agentProvider, fixtureManager, mockManager } = require('../../utils/e2e-framework');
const { stripeMocker } = require('../../utils/e2e-framework-mock-manager');
const DomainEvents = require('@tryghost/domain-events/lib/DomainEvents');
const logging = require('@tryghost/logging');
const nock = require('nock');
const sinon = require('sinon');
const models = require('../../../core/server/models');

interface Agent {
  get: (_url: string) => any;
  put: (_url: string) => any;
  post: (_url: string) => any;
  delete: (_url: string) => any;
}

interface MembersAgent extends Agent {
  loginAs: (_email: string) => Promise<void>;
}

interface AdminAgent extends Agent {
  loginAsOwner: () => Promise<void>;
}

interface ContentAPIAgent {
  get: (_url: string) => any;
  authenticate: () => Promise<void>;
}

/** An address as a member gives it: every part named, an empty one as null. */
const ADDRESS = {
  line1: '1 High Street',
  line2: null,
  city: 'London',
  state: null,
  postal_code: 'N1 9GU',
  country: 'GB',
};

/** Everything the tier a member changes to below requires, answered. */
const ANSWERED = {
  'checkout.shipping.name': 'Ada Lovelace',
  'checkout.shipping.address': ADDRESS,
  // In the form the phone field keeps it in, so it reads back as it was sent.
  'checkout.phone': '+447400123456',
};

/** The same address as it reads back: only the parts that hold something. */
const ADDRESS_HELD = {
  line1: '1 High Street',
  city: 'London',
  postal_code: 'N1 9GU',
  country: 'GB',
};

// A member's answers to what a tier asks, given with a change of tier by the port each is
// collected under, which saves them the way a checkout for that tier would, and read back from the
// member's own record through the field the tier names. Set up and checked through the Admin and
// members APIs.
describe('Member answers by port', function () {
  let adminAgent: AdminAgent;
  let membersAgent: MembersAgent;
  let contentAPIAgent: ContentAPIAgent;
  let addressKey: string;
  let recipientKey: string;
  let phoneKey: string;

  async function defineField(name: string, type: string, access = 'write'): Promise<string> {
    const { body } = await adminAgent
      .post('members/metafields/custom/')
      .body({ members_metafields: [{ name, type, access: { member: access } }] })
      .expectStatus(201);
    return body.members_metafields[0].key;
  }

  async function editField(key: string, edit: Record<string, unknown>): Promise<void> {
    await adminAgent
      .put(`members/metafields/custom/${key}/`)
      .body({ members_metafields: [edit] })
      .expectStatus(200);
  }

  async function memberIdOf(email: string): Promise<string> {
    const { body } = await adminAgent.get(`members/?filter=email:'${email}'`).expectStatus(200);
    return body.members[0].id;
  }

  /** A member's custom field values, as staff see them. */
  async function heldAsStaff(memberId: string): Promise<Record<string, unknown>> {
    const { body } = await adminAgent.get(`members/${memberId}/`).expectStatus(200);
    return body.members[0].metafields?.custom ?? {};
  }

  async function holdAsStaff(memberId: string, custom: Record<string, unknown>): Promise<void> {
    await adminAgent
      .put(`members/${memberId}/`)
      .body({ members: [{ metafields: { custom } }] })
      .expectStatus(200);
  }

  /**
   * Binds the shipping and phone ports to the fields, shipping on these paid tiers, or on every
   * paid tier for none, to these countries, or everywhere for none, and the phone number on every
   * paid tier.
   */
  async function collect(shippingTierIds?: string[], countries?: string[]): Promise<void> {
    await adminAgent
      .put('stripe/checkout/config/')
      .body({
        checkout_config: [
          {
            shipping: {
              collect: true,
              ...(shippingTierIds ? { tier_ids: shippingTierIds } : {}),
              ...(countries ? { allowed_countries: countries } : {}),
              address: { custom_field_key: addressKey },
              name: { custom_field_key: recipientKey },
            },
            phone: { collect: true, custom_field_key: phoneKey },
          },
        ],
      })
      .expectStatus(200);
  }

  beforeAll(async function () {
    ({ adminAgent, membersAgent, contentAPIAgent } = await agentProvider.getAgentsForMembers());
    await fixtureManager.init('newsletters', 'members:newsletters', 'integrations', 'api_keys');
    await adminAgent.loginAsOwner();
    await contentAPIAgent.authenticate();
  });

  beforeEach(async function () {
    mockManager.mockMail();
    mockManager.mockStripe();
    mockManager.mockLabsEnabled('stripeCheckoutCollection');
    mockManager.mockLabsEnabled('customFieldTypePhone');
    addressKey = await defineField('Delivery address', 'address');
    recipientKey = await defineField('Recipient name', 'short_text');
    phoneKey = await defineField('Contact phone', 'phone');
    await collect();
  });

  afterEach(async function () {
    mockManager.restore();
    await models.Base.knex('stripe_checkout_config_tiers').del();
    await models.Base.knex('stripe_checkout_config').del();
    await models.Base.knex('members_metafield_bindings').del();
    await models.Base.knex('tier_requirement_tiers').del();
    await models.Base.knex('tier_requirements').del();
    await models.Base.knex('members_metafield_values').del();
    await models.Base.knex('members_metafields').del();
    await models.Base.knex('webhooks').del();
  });

  describe('given with a change of tier', function () {
    let fromTierId: string;
    let toTierId: string;
    let memberId: string;
    let email: string;
    let subscriptionId: string;

    /** Which tier the member's subscription is on now. */
    async function tierNow(): Promise<string> {
      const { body } = await adminAgent.get(`members/${memberId}/`).expectStatus(200);
      return body.members[0].subscriptions[0].tier.id;
    }

    /** What staff are shown the member changed about their custom fields, newest first. */
    async function fieldChangesInActivityFeed() {
      const filter = encodeURIComponent(`data.member_id:'${memberId}'+type:metafield_change_event`);
      const { body } = await adminAgent
        .get(`members/events/?filter=${filter}&limit=1000`)
        .expectStatus(200);
      return body.events;
    }

    /**
     * Changes the member's plan to a tier, as Portal does, with these answers if any, expecting
     * the site to answer with `status`.
     */
    async function changeTier(
      tierId: string,
      status: number,
      answers?: Record<string, unknown>,
      subscription = subscriptionId,
    ) {
      const membersService = require('../../../core/server/services/members');
      const member = await models.Member.findOne({ email });
      const identity = await membersService.api.getMemberIdentityToken(member.get('transient_id'));
      return membersAgent
        .put(`/api/subscriptions/${subscription}/`)
        .body({ identity, tierId, cadence: 'month', ...(answers ? { answers } : {}) })
        .expectStatus(status);
    }

    beforeEach(async function () {
      const from = await stripeMocker.createTier({
        currency: 'usd',
        monthly_price: 500,
        yearly_price: 5000,
      });
      const to = await stripeMocker.createTier({
        currency: 'usd',
        monthly_price: 900,
        yearly_price: 9000,
      });
      fromTierId = from.id;
      toTierId = to.id;
      // Only the tier they change to ships to them.
      await collect([toTierId]);

      // A paying member on the first tier.
      email = `paying-${Date.now()}@example.com`;
      await adminAgent
        .post('members/')
        .body({ members: [{ email }] })
        .expectStatus(201);
      memberId = await memberIdOf(email);
      const customer = stripeMocker.createCustomer({ email });
      const price = await stripeMocker.getPriceForTier(from.get('slug'), 'month');
      ({ id: subscriptionId } = await stripeMocker.createSubscription({ customer, price }));
      await DomainEvents.allSettled();
      assert.equal(await tierNow(), fromTierId);
    });

    it('changes tier without answers, for a caller that knows nothing of requirements', async function () {
      await changeTier(toTierId, 204);

      assert.equal(await tierNow(), toTierId);
      assert.deepEqual(await heldAsStaff(memberId), {});
    });

    it('saves each answer into the field its port writes into, as one change the member made in Portal', async function () {
      await changeTier(toTierId, 204, ANSWERED);

      assert.equal(await tierNow(), toTierId);
      assert.deepEqual(await heldAsStaff(memberId), {
        [addressKey]: ADDRESS_HELD,
        [recipientKey]: 'Ada Lovelace',
        [phoneKey]: '+447400123456',
      });
      const events = await fieldChangesInActivityFeed();
      assert.equal(events.length, 1, 'one entry for one change of tier');
      assert.equal(events[0].data.written_by_type, 'member', 'the member gave them themselves');
      assert.equal(events[0].data.source, 'portal');
    });

    // Portal sends the number as written beside the country picked, such as with a national 0
    // after the code, and the phone field keeps it in its international form.
    it('keeps a phone number in its international form', async function () {
      await changeTier(toTierId, 204, { 'checkout.phone': '+44 07400 123456' });

      assert.equal((await heldAsStaff(memberId))[phoneKey], '+447400123456');
    });

    it("reads back from the member's own record, through the field each port the tier names", async function () {
      await changeTier(toTierId, 204, ANSWERED);

      // As Portal fills in a later change of tier from what the member gave: the tier as anyone
      // reads it, and the member's own record.
      const { body: listed } = await contentAPIAgent
        .get('/tiers/?include=requirements')
        .expectStatus(200);
      await membersAgent.loginAs(email);
      const { body: member } = await membersAgent.get('/api/member/').expectStatus(200);
      const tier = listed.tiers.find((candidate: { id: string }) => candidate.id === toTierId);
      const ports: Array<{ port: string; field: string }> = tier.requirements.flatMap(
        (requirement: { ports: Record<string, { port: string; field: string }> }) =>
          Object.values(requirement.ports),
      );
      const held = Object.fromEntries(
        ports.map(({ port, field }) => {
          const [namespace, key] = field.split('.');
          return [port, member.metafields[namespace][key]];
        }),
      );
      assert.deepEqual(held, { ...ANSWERED, 'checkout.shipping.address': ADDRESS_HELD });
    });

    it('replaces an address as a whole, clearing the parts left out', async function () {
      await holdAsStaff(memberId, {
        [addressKey]: { ...ADDRESS_HELD, line2: 'Flat 3', state: 'Islington' },
      });

      await changeTier(toTierId, 204, {
        ...ANSWERED,
        'checkout.shipping.address': { line1: '2 Low Road', city: 'Leeds', country: 'GB' },
      });

      assert.deepEqual((await heldAsStaff(memberId))[addressKey], {
        line1: '2 Low Road',
        city: 'Leeds',
        country: 'GB',
      });
    });

    it('tells member webhooks about the answers a change of tier saves', async function () {
      // Every delivery is kept, as the change of tier's own edit to the member is sent too.
      const delivered: Array<{
        member: { current: { email: string; metafields?: { custom?: Record<string, unknown> } } };
      }> = [];
      nock('https://test-webhook-receiver.com')
        .persist()
        .post('/tier-change-member-edited/')
        .reply(200, (_uri: string, body: unknown) => {
          delivered.push(typeof body === 'string' ? JSON.parse(body) : body);
          return {};
        });
      await fixtureManager.insertWebhook({
        event: 'member.edited',
        url: 'https://test-webhook-receiver.com/tier-change-member-edited/',
      });

      await changeTier(toTierId, 204, ANSWERED);

      const withAnswers = await vi.waitUntil(
        () => delivered.find(({ member }) => member.current.metafields?.custom?.[addressKey]),
        { timeout: 5000 },
      );
      assert.equal(withAnswers.member.current.email, email);
      assert.deepEqual(withAnswers.member.current.metafields?.custom, {
        [addressKey]: ADDRESS_HELD,
        [recipientKey]: 'Ada Lovelace',
        [phoneKey]: '+447400123456',
      });
    });

    it('leaves the member on their tier when answers are refused, naming every one by its port', async function () {
      await holdAsStaff(memberId, { [addressKey]: ADDRESS_HELD });
      // Hidden from members, so a refusal must not name the field.
      await editField(addressKey, { access: { member: 'none' } });

      const { body } = await changeTier(toTierId, 422, {
        ...ANSWERED,
        'checkout.shipping.address': { ...ADDRESS, country: 'United Kingdom' },
        'checkout.phone': 'x'.repeat(300),
      });

      assert.equal(body.errors[0].type, 'ValidationError');
      assert.deepEqual(
        body.errors[0].details.map((refusal: { property: string }) => refusal.property).sort(),
        ['answers.checkout.phone', 'answers.checkout.shipping.address.country'],
      );
      assert.ok(!JSON.stringify(body).includes(addressKey), 'the field is not named');
      assert.equal(await tierNow(), fromTierId);
      assert.deepEqual(await heldAsStaff(memberId), { [addressKey]: ADDRESS_HELD });
    });

    it('refuses an address in a country the new tier does not ship to', async function () {
      await collect([toTierId], ['US']);

      const { body } = await changeTier(toTierId, 422, ANSWERED);

      assert.equal(body.errors[0].property, 'answers.checkout.shipping.address.country');
      assert.equal(await tierNow(), fromTierId);
      assert.deepEqual(await heldAsStaff(memberId), {});
    });

    it('refuses a requirement answered in part, naming each answer it leaves out', async function () {
      const { body } = await changeTier(toTierId, 422, {
        'checkout.shipping.address': ADDRESS,
        'checkout.phone': '+44 7400 123456',
      });

      assert.equal(body.errors[0].property, 'answers.checkout.shipping.name');
      assert.equal(await tierNow(), fromTierId);
      assert.deepEqual(await heldAsStaff(memberId), {});
    });

    it('saves the rest with a requirement left out whole, as a client may not know of it', async function () {
      await changeTier(toTierId, 204, { 'checkout.phone': '+44 7400 123456' });

      assert.equal(await tierNow(), toTierId);
      assert.deepEqual(await heldAsStaff(memberId), { [phoneKey]: '+447400123456' });
    });

    it('refuses an address outside the countries alongside what its fields refuse', async function () {
      await collect([toTierId], ['US']);

      const { body } = await changeTier(toTierId, 422, {
        ...ANSWERED,
        'checkout.phone': 'x'.repeat(300),
      });

      assert.deepEqual(
        body.errors[0].details.map((refusal: { property: string }) => refusal.property).sort(),
        ['answers.checkout.phone', 'answers.checkout.shipping.address.country'],
      );
    });

    it('drops an address for an archived field rather than refusing its country', async function () {
      await collect([toTierId], ['US']);
      await editField(addressKey, { status: 'archived' });

      await changeTier(toTierId, 204, ANSWERED);

      assert.equal(await tierNow(), toTierId);
    });

    it('refuses an address with no country, as nobody can ship to it', async function () {
      const { body } = await changeTier(toTierId, 422, {
        ...ANSWERED,
        'checkout.shipping.address': { line1: '1 High Street', city: 'London' },
      });

      assert.equal(body.errors[0].property, 'answers.checkout.shipping.address.country');
    });

    it('takes an address in any country when the tier ships anywhere, even where Stripe does not', async function () {
      await changeTier(toTierId, 204, {
        ...ANSWERED,
        'checkout.shipping.address': { ...ADDRESS, country: 'CU' },
      });

      assert.deepEqual((await heldAsStaff(memberId))[addressKey], {
        ...ADDRESS_HELD,
        country: 'CU',
      });
    });

    it('refuses an empty answer rather than clearing what the field holds', async function () {
      await holdAsStaff(memberId, { [addressKey]: ADDRESS_HELD });

      const { body } = await changeTier(toTierId, 422, {
        ...ANSWERED,
        'checkout.shipping.address': { line1: null },
      });

      assert.equal(body.errors[0].property, 'answers.checkout.shipping.address');
      assert.deepEqual((await heldAsStaff(memberId))[addressKey], ADDRESS_HELD);
    });

    it('refuses an answer of nothing rather than clearing what the field holds', async function () {
      await holdAsStaff(memberId, { [phoneKey]: '+44 7400 123456' });

      const { body } = await changeTier(toTierId, 422, { 'checkout.phone': null });

      assert.equal(body.errors[0].property, 'answers.checkout.phone');
      assert.equal((await heldAsStaff(memberId))[phoneKey], '+447400123456');
    });

    it("saves nothing with a subscription that is not the member's", async function () {
      await changeTier(toTierId, 404, { 'checkout.phone': '+44 7400 123456' }, 'sub_not_theirs');

      assert.deepEqual(await heldAsStaff(memberId), {});
    });

    it('refuses an answer to a port that collects nothing', async function () {
      const { body } = await changeTier(toTierId, 422, {
        'checkout.email': 'ada@example.com',
      });

      assert.equal(body.errors[0].property, 'answers');
      assert.equal(await tierNow(), fromTierId);
    });

    it('saves into a field members cannot read, as a checkout would', async function () {
      await editField(phoneKey, { access: { member: 'none' } });

      await changeTier(toTierId, 204, ANSWERED);

      assert.equal((await heldAsStaff(memberId))[phoneKey], '+447400123456');
    });

    it('drops an answer the new tier does not ask for', async function () {
      const other = await stripeMocker.createTier({
        currency: 'usd',
        monthly_price: 700,
        yearly_price: 7000,
      });

      // This tier asks for a phone number, but doesn't ship to members.
      await changeTier(other.id, 204, {
        'checkout.shipping.name': 'Ada Lovelace',
        'checkout.phone': '+44 7400 123456',
      });

      assert.deepEqual(await heldAsStaff(memberId), { [phoneKey]: '+447400123456' });
    });

    it('drops an answer for an archived field', async function () {
      await editField(phoneKey, { status: 'archived' });

      await changeTier(toTierId, 204, ANSWERED);

      await editField(phoneKey, { status: 'active' });
      assert.equal((await heldAsStaff(memberId))[phoneKey], undefined);
    });

    it('saves nothing with a change that keeps the tier, as it asks for nothing', async function () {
      await collect();

      await changeTier(fromTierId, 204, { 'checkout.phone': '+44 7400 123456' });

      assert.deepEqual(await heldAsStaff(memberId), {});
    });

    it('drops every answer while checkouts ask for nothing, and still changes tier', async function () {
      mockManager.mockLabsDisabled('stripeCheckoutCollection');

      await changeTier(toTierId, 204, { 'checkout.shipping.name': 'Ada Lovelace' });

      assert.equal(await tierNow(), toTierId);
      assert.deepEqual(await heldAsStaff(memberId), {});
    });

    it('reports a change of tier as made when its answers fail to save, logging that they were lost', async function () {
      // Nothing a request can do fails the save once the answers are checked, so the member edit
      // that saves them fails here as a database write would.
      const membersService = require('../../../core/server/services/members');
      const failure = new Error('The database went away.');
      sinon.stub(membersService.api.memberBREADService, 'updateWithMetafields').rejects(failure);
      const errors = sinon.stub(logging, 'error');

      await changeTier(toTierId, 204, ANSWERED);

      assert.equal(await tierNow(), toTierId);
      assert.deepEqual(await heldAsStaff(memberId), {});
      assert.deepEqual(errors.args, [
        [
          {
            event: { name: 'members.tier_change.answers_not_saved' },
            err: failure,
            member_id: memberId,
            subscription_id: subscriptionId,
          },
        ],
      ]);
    });
  });
});
