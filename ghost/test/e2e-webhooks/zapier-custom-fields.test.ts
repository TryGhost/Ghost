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
 * The Admin API surfaces the Zapier app uses, called with the Zapier integration's key:
 *
 *  - Member Created / Member Updated triggers -> member.added / member.edited webhooks
 *  - Find a Member                             -> GET  /members/?filter=email:'...'
 *  - Create Member                             -> POST /members/
 *  - Update Member                             -> PUT  /members/:id/
 */
describe('Zapier and member custom fields', function () {
  type Agent = {
    get: (_url: string) => any;
    put: (_url: string) => any;
    post: (_url: string) => any;
    delete: (_url: string) => any;
    loginAsOwner: () => Promise<void>;
    useZapierAdminAPIKey: () => Promise<void>;
  };

  let publisher: Agent & { app: unknown };
  let zapier: Agent;
  let webhookMockReceiver: any;

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

  // The receiver nests the request body one level down.
  function deliveredPayload() {
    return webhookMockReceiver.body.body;
  }

  beforeAll(async function () {
    publisher = await agentProvider.getAdminAPIAgent();
    await fixtureManager.init('integrations');
    await publisher.loginAsOwner();

    // Reuses the booted app; another agentProvider call would reboot Ghost and drop the owner's session.
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
    it('writes a custom field through the members endpoint its Update Member action uses', async function () {
      const key = await definePublisherField('Favourite topic');
      const memberId = await createMember('zap-writes@example.com');

      const { body } = await zapier
        .put(`members/${memberId}/`)
        .body({ members: [{ metafields: { custom: { [key]: 'Ghost internals' } } }] })
        .expectStatus(200);

      assert.deepEqual(body.members[0].metafields.custom, { [key]: 'Ghost internals' });
    });

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
      // The member had no custom fields before this edit.
      assert.deepEqual(member.previous, { metafields: {} });
    });

    it('shows all the custom fields a member had before an edit changed one', async function () {
      const topicKey = await definePublisherField('Favourite topic');
      const colourKey = await definePublisherField('Favourite colour');
      const memberId = await createMember('zap-previous@example.com');
      await zapierWritesField(memberId, topicKey, 'Reading');
      await zapierWritesField(memberId, colourKey, 'Green');
      await subscribeZapTo(
        'member.edited',
        'https://test-webhook-receiver.com/zapier-member-edited/',
      );

      await zapierWritesField(memberId, topicKey, 'Ghost internals');
      await webhookMockReceiver.receivedRequest();

      const { member } = deliveredPayload();
      assert.deepEqual(member.current.metafields.custom, {
        [topicKey]: 'Ghost internals',
        [colourKey]: 'Green',
      });
      assert.deepEqual(member.previous.metafields.custom, {
        [topicKey]: 'Reading',
        [colourKey]: 'Green',
      });
    });

    it('shows the custom fields beside the other fields an edit changed', async function () {
      const key = await definePublisherField('Favourite topic');
      const memberId = await createMember('zap-mixed@example.com');
      await zapierWritesField(memberId, key, 'Reading');
      await subscribeZapTo(
        'member.edited',
        'https://test-webhook-receiver.com/zapier-member-edited/',
      );

      await zapier
        .put(`members/${memberId}/`)
        .body({
          members: [{ name: 'Renamed', metafields: { custom: { [key]: 'Ghost internals' } } }],
        })
        .expectStatus(200);
      await webhookMockReceiver.receivedRequest();

      const { member } = deliveredPayload();
      assert.equal(member.current.name, 'Renamed');
      assert.deepEqual(member.current.metafields.custom, { [key]: 'Ghost internals' });
      assert.equal(Object.hasOwn(member.previous, 'name'), true);
      assert.deepEqual(member.previous.metafields.custom, { [key]: 'Reading' });
    });

    it('leaves custom fields out of previous when an edit writes the values they already had', async function () {
      const key = await definePublisherField('Favourite topic');
      const memberId = await createMember('zap-same@example.com');
      await zapierWritesField(memberId, key, 'Reading');
      await subscribeZapTo(
        'member.edited',
        'https://test-webhook-receiver.com/zapier-member-edited/',
      );

      await zapierWritesField(memberId, key, 'Reading');
      await webhookMockReceiver.receivedRequest();

      const { member } = deliveredPayload();
      assert.deepEqual(member.current.metafields.custom, { [key]: 'Reading' });
      assert.equal(Object.hasOwn(member.previous, 'metafields'), false);
    });

    it('leaves custom fields off the New Member payload of a member who holds none', async function () {
      await definePublisherField('Favourite topic');
      await subscribeZapTo(
        'member.added',
        'https://test-webhook-receiver.com/zapier-member-added/',
      );

      await createMember('zap-added@example.com');
      await webhookMockReceiver.receivedRequest();

      const { member } = deliveredPayload();
      assert.equal(member.current.email, 'zap-added@example.com');
      assert.equal(Object.hasOwn(member.current, 'metafields'), false);
    });

    it('shows the custom fields a deleted member had', async function () {
      const key = await definePublisherField('Favourite topic');
      const memberId = await createMember('zap-deleted@example.com');
      await zapierWritesField(memberId, key, 'Reading');
      await subscribeZapTo(
        'member.deleted',
        'https://test-webhook-receiver.com/zapier-member-deleted/',
      );

      await zapier.delete(`members/${memberId}/`).expectStatus(204);
      await webhookMockReceiver.receivedRequest();

      const { member } = deliveredPayload();
      assert.equal(member.previous.email, 'zap-deleted@example.com');
      assert.deepEqual(member.previous.metafields.custom, { [key]: 'Reading' });
    });

    it('leaves custom fields off a deleted member who had none', async function () {
      await definePublisherField('Favourite topic');
      const memberId = await createMember('zap-deleted-none@example.com');
      await subscribeZapTo(
        'member.deleted',
        'https://test-webhook-receiver.com/zapier-member-deleted-none/',
      );

      await zapier.delete(`members/${memberId}/`).expectStatus(204);
      await webhookMockReceiver.receivedRequest();

      const { member } = deliveredPayload();
      assert.equal(member.previous.email, 'zap-deleted-none@example.com');
      assert.equal(Object.hasOwn(member.previous, 'metafields'), false);
    });

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

  describe('creating a member', function () {
    it('creates a member and their custom fields in one Create Member call', async function () {
      const key = await definePublisherField('Favourite topic');
      await subscribeZapTo(
        'member.added',
        'https://test-webhook-receiver.com/zapier-member-added-with-values/',
      );

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
        .expectStatus(201);
      await webhookMockReceiver.receivedRequest();

      assert.deepEqual(body.members[0].metafields.custom, { [key]: 'Ghost internals' });
      const { member } = deliveredPayload();
      assert.equal(member.current.email, 'zap-creates@example.com');
      assert.deepEqual(member.current.metafields.custom, { [key]: 'Ghost internals' });
    });
  });
});
