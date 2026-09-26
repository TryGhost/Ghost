import assert from 'node:assert/strict';

const {
  agentProvider,
  fixtureManager,
  mockManager,
  dbUtils,
  configUtils,
} = require('../utils/e2e-framework');
const AdminAPITestAgent = require('../utils/agents/admin-api-test-agent');
const models = require('../../core/server/models');

/**
 * What the Zapier integration can and cannot do with member custom fields.
 *
 * Asked of the surfaces the published Zapier app (TryGhost/Zapier) actually uses, in the
 * order a publisher would hit them:
 *
 *  - "New Member" / "Updated Member" triggers -> REST hooks on member.added / member.edited
 *  - "Find a Member" search                   -> GET  /members/?filter=email:'...'
 *  - "Create Member" action                   -> POST /members/
 *  - "Update Member" action                   -> PUT  /members/:id/
 *
 * Every one of them authenticates as the built-in Zapier integration, so there are two
 * agents here: `publisher` does what a signed-in owner does in Admin, and `zapier` holds
 * the integration's admin key. An integration is a different caller from a person, and
 * the question is what Zapier sees rather than what Admin sees.
 */
describe('Zapier and member custom fields', function () {
  type Agent = {
    get: (_url: string) => any;
    put: (_url: string) => any;
    post: (_url: string) => any;
    loginAsOwner: () => Promise<void>;
    useZapierAdminAPIKey: () => Promise<void>;
  };

  let publisher: Agent & { app: unknown };
  let zapier: Agent;
  let webhookMockReceiver: any;

  // A publisher defines fields in Admin, so these are created as the owner.
  async function definePublisherField(name: string): Promise<string> {
    const { body } = await publisher
      .post('members/metafields/custom/')
      .body({ members_metafields: [{ name, type: 'short_text' }] })
      .expectStatus(201);
    return body.members_metafields[0].key;
  }

  async function createMember(email: string): Promise<string> {
    const { body } = await publisher
      .post('members/')
      .body({ members: [{ email }] })
      .expectStatus(201);
    return body.members[0].id;
  }

  // What Zapier's "Update Member" action would send if it had a field for this.
  async function zapierWritesField(memberId: string, key: string, value: string) {
    await zapier
      .put(`members/${memberId}/`)
      .body({ members: [{ metafields: { custom: { [key]: value } } }] })
      .expectStatus(200);
  }

  async function subscribeZapTo(event: string, url: string) {
    await webhookMockReceiver.mock(url);
    await fixtureManager.insertWebhook({ event, url });
  }

  // The receiver records the parsed request body one level down; unwrap it once here so
  // the assertions read as the payload a Zap would receive.
  function deliveredPayload() {
    return webhookMockReceiver.body.body;
  }

  beforeAll(async function () {
    publisher = await agentProvider.getAdminAPIAgent();
    await fixtureManager.init('integrations');
    await publisher.loginAsOwner();

    // A second agent against the same booted Ghost, rather than a second
    // agentProvider call: that would reboot Ghost and drop the session above.
    zapier = new AdminAPITestAgent(publisher.app, {
      apiURL: '/ghost/api/admin/',
      originURL: configUtils.config.get('url'),
    }) as unknown as Agent;
    await zapier.useZapierAdminAPIKey();
  });

  beforeEach(async function () {
    mockManager.mockLabsEnabled('membersCustomFields');
    await dbUtils.truncate('webhooks');
    webhookMockReceiver = mockManager.mockWebhookRequests();
  });

  afterEach(async function () {
    mockManager.restore();
    await models.Base.knex('members_metafield_values').del();
    await models.Base.knex('members_metafields').del();
    await models.Base.knex('members').del();
    await models.Base.knex('actions')
      .whereIn('resource_type', ['member', 'member_custom_field'])
      .del();
  });

  describe('the members endpoint', function () {
    // The escape hatch the announcement wants to offer: a survey tool posts an answer to
    // Zapier, and Zapier files it against the member. Ghost's side of that works today,
    // with an integration key and no change to Ghost.
    it('writes a custom field through the members endpoint its Update Member action uses', async function () {
      const key = await definePublisherField('Favourite topic');
      const memberId = await createMember('zap-writes@example.com');

      const { body } = await zapier
        .put(`members/${memberId}/`)
        .body({ members: [{ metafields: { custom: { [key]: 'Ghost internals' } } }] })
        .expectStatus(200);

      assert.deepEqual(body.members[0].metafields.custom, { [key]: 'Ghost internals' });
    });

    // The values are reachable from a Zap too, but only by asking for them. The search
    // Zapier actually makes does not ask, which is the gap — this pins that the asking
    // works, so closing it is a change to the Zapier app rather than to Ghost.
    it('returns the values on a member browse that asks for them', async function () {
      const key = await definePublisherField('Favourite topic');
      const memberId = await createMember('zap-browses@example.com');
      await zapierWritesField(memberId, key, 'Ghost internals');

      const filter = encodeURIComponent("email:'zap-browses@example.com'");
      const { body } = await zapier
        .get(`members/?include=metafields&filter=${filter}`)
        .expectStatus(200);

      assert.deepEqual(body.members[0].metafields.custom, { [key]: 'Ghost internals' });
    });
  });

  describe('the member webhooks its triggers subscribe to', function () {
    // The "Updated Member" trigger is how a custom field reaches another tool. A
    // custom-field-only edit is a member edit as far as the event system is concerned, so
    // the Zap fires; this pins that it can also see what it fired about.
    it('carries custom fields in the Updated Member trigger payload', async function () {
      const key = await definePublisherField('Favourite topic');
      const memberId = await createMember('zap-trigger@example.com');
      await subscribeZapTo(
        'member.edited',
        'https://test-webhook-receiver.com/zapier-member-edited/',
      );

      await zapierWritesField(memberId, key, 'Ghost internals');
      await webhookMockReceiver.receivedRequest();

      const { member } = deliveredPayload();
      assert.equal(member.current.email, 'zap-trigger@example.com');
      assert.deepEqual(member.current.metafields.custom, { [key]: 'Ghost internals' });
      // `previous` still says nothing about custom fields: the values a write replaced
      // are not on the model the event carries, so a Zap sees what a member holds now
      // rather than which field changed.
      assert.deepEqual(member.previous, {});
    });

    it('carries custom fields in the New Member trigger payload', async function () {
      const key = await definePublisherField('Favourite topic');
      await subscribeZapTo(
        'member.added',
        'https://test-webhook-receiver.com/zapier-member-added/',
      );

      const memberId = await createMember('zap-added@example.com');
      await zapierWritesField(memberId, key, 'Ghost internals');
      await webhookMockReceiver.receivedRequest();

      const { member } = deliveredPayload();
      assert.equal(member.current.email, 'zap-added@example.com');
      // A member has no custom fields at the moment they are created — the endpoint
      // refuses them there — so this is the empty object a defined-but-unanswered
      // field gives, not a missing key.
      assert.deepEqual(member.current.metafields.custom, {});
    });

    // A site that has never defined a field keeps exactly the payload it had before the
    // feature existed: the key is absent rather than empty, so nothing reading these
    // webhooks has a new field to account for.
    it('leaves the key off entirely for a site with no custom fields', async function () {
      await subscribeZapTo(
        'member.added',
        'https://test-webhook-receiver.com/zapier-member-added-no-fields/',
      );

      await createMember('zap-no-fields@example.com');
      await webhookMockReceiver.receivedRequest();

      const { member } = deliveredPayload();
      assert.equal(member.current.email, 'zap-no-fields@example.com');
      assert.equal(member.current.metafields, undefined);
    });
  });

  describe('what a Zap still cannot reach', function () {
    // "Find a Member" browses by email and takes the record as it comes. It asks for no
    // includes, so the fields are missing from the step's output and from every later
    // step that maps off it.
    it('does not return custom fields to the Find a Member search', async function () {
      const key = await definePublisherField('Favourite topic');
      const memberId = await createMember('zap-search@example.com');
      await zapierWritesField(memberId, key, 'Ghost internals');

      // Exactly the request app/searches/member.js makes.
      const filter = encodeURIComponent("email:'zap-search@example.com'");
      const { body } = await zapier.get(`members/?filter=${filter}`).expectStatus(200);

      assert.equal(body.members.length, 1);
      assert.equal(body.members[0].metafields, undefined);
    });

    // Signing a member up and filing their answers in one step is the shape a survey Zap
    // would reach for, and it takes two steps instead: create, then update. Ghost says so
    // rather than dropping the values, so a Zap built the wrong way fails loudly.
    it('refuses custom fields sent to the Create Member action', async function () {
      const key = await definePublisherField('Favourite topic');

      const { body } = await zapier
        .post('members/')
        .body({
          members: [
            {
              email: 'zap-creates@example.com',
              metafields: { custom: { [key]: 'Ghost internals' } },
            },
          ],
        })
        .expectStatus(422);

      assert.match(body.errors[0].context, /Create the member, then set values with an edit/);
    });
  });
});
