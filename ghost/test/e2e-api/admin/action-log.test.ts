import assert from 'node:assert/strict';

const {
  agentProvider,
  dbUtils,
  fixtureManager,
  mockManager,
} = require('../../utils/e2e-framework');
const models = require('../../../core/server/models');
const { mockSystemTime } = require('../../utils/clock-utils');
const { assertActions } =
  require('../../utils/action-log') as typeof import('../../utils/action-log');

type ApiAction = {
  id: string;
  resource_id: string | null;
  resource_type: string;
  actor_id: string;
  actor_type: string;
  event: string;
  context: string | null;
  created_at: string;
  actor?: Record<string, unknown>;
  resource?: Record<string, unknown>;
};

/**
 * What the actions API returns for every way Ghost writes an action, and how it lists them.
 * Each test makes a change through the Admin API and reads the action back through the Admin
 * API, so the tests hold whatever stores or loads the action.
 */
describe('Action log Admin API', function () {
  let agent: {
    get: (_url: string) => any;
    post: (_url: string) => any;
    put: (_url: string) => any;
    delete: (_url: string) => any;
    loginAsOwner: () => Promise<void>;
    loginAsEditor: () => Promise<void>;
    loginAsContributor: () => Promise<void>;
    useZapierAdminAPIKey: () => Promise<void>;
  };
  let ownerId: string;
  let owner: { type: 'user'; id: string };
  let clock: { tick(ms: number): void; restore(): void } | undefined;

  /** Actions are stored to the second, so a list in a known order needs them a second apart. */
  function aSecondLater(): void {
    const running = clock ?? mockSystemTime(Date.now());
    clock = running;
    running.tick(1000);
  }

  async function browse(query: string): Promise<{ actions: ApiAction[]; meta: any }> {
    const { body } = await agent.get(`actions/?${query}`).expectStatus(200);
    return body;
  }

  async function addTag(name: string): Promise<{ id: string; slug: string }> {
    const { body } = await agent
      .post('tags/')
      .body({ tags: [{ name }] })
      .expectStatus(201);
    return body.tags[0];
  }

  async function addPost(title: string): Promise<{ id: string; updated_at: string }> {
    const { body } = await agent
      .post('posts/')
      .body({ posts: [{ title }] })
      .expectStatus(201);
    return body.posts[0];
  }

  beforeAll(async function () {
    agent = await agentProvider.getAdminAPIAgent();
    await fixtureManager.init('users', 'integrations', 'api_keys');
    await agent.loginAsOwner();
    const { body } = await agent.get('users/me/').expectStatus(200);
    ownerId = body.users[0].id;
    owner = { type: 'user', id: ownerId };
  });

  afterEach(async function () {
    clock?.restore();
    clock = undefined;
    mockManager.restore();
    await models.Base.knex('actions').del();
  });

  describe('Listing', function () {
    it('returns the stored fields of an action, with its context as a JSON string', async function () {
      const tag = await addTag('Stored fields');

      const { actions } = await browse(`filter=${encodeURIComponent(`resource_id:'${tag.id}'`)}`);

      assert.equal(actions.length, 1);
      const [action] = actions;
      assert.deepEqual(Object.keys(action).sort(), [
        'actor_id',
        'actor_type',
        'context',
        'created_at',
        'event',
        'id',
        'resource_id',
        'resource_type',
      ]);
      assert.match(action.id, /^[a-f\d]{24}$/);
      assert.match(action.created_at, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.000Z$/);
      assert.equal(typeof action.context, 'string');
      assert.deepEqual(
        { ...action, id: null, created_at: null, context: JSON.parse(action.context ?? '') },
        {
          id: null,
          resource_id: tag.id,
          resource_type: 'tag',
          actor_id: ownerId,
          actor_type: 'user',
          event: 'added',
          context: { primary_name: 'Stored fields' },
          created_at: null,
        },
      );
    });

    it('lists the newest action first, a page at a time', async function () {
      const first = await addTag('Page one');
      aSecondLater();
      const second = await addTag('Page two');
      aSecondLater();
      const third = await addTag('Page three');

      const pageOne = await browse('filter=resource_type:tag&limit=2');
      assert.deepEqual(
        pageOne.actions.map((action) => action.resource_id),
        [third.id, second.id],
      );
      assert.deepEqual(pageOne.meta, {
        pagination: { page: 1, limit: 2, pages: 2, total: 3, next: 2, prev: null },
      });

      const pageTwo = await browse('filter=resource_type:tag&limit=2&page=2');
      assert.deepEqual(
        pageTwo.actions.map((action) => action.resource_id),
        [first.id],
      );
      assert.deepEqual(pageTwo.meta, {
        pagination: { page: 2, limit: 2, pages: 2, total: 3, next: null, prev: 1 },
      });
    });

    it('filters as the History page does: by event, resource type, actor and date', async function () {
      const tag = await addTag('Filtered');
      aSecondLater();
      await agent
        .put(`tags/${tag.id}/`)
        .body({ tags: [{ name: 'Filtered again' }] })
        .expectStatus(200);
      aSecondLater();
      await addPost('Filtered post');

      const events = async (filter: string) =>
        (await browse(`filter=${encodeURIComponent(filter)}`)).actions.map(
          (action) => `${action.resource_type} ${action.event}`,
        );

      assert.deepEqual(await events('event:-[added]'), ['tag edited']);
      assert.deepEqual(await events('resource_type:-[post]'), ['tag edited', 'tag added']);
      assert.deepEqual(await events('resource_type:-[post]+event:-[edited]'), ['tag added']);
      assert.deepEqual(await events(`actor_id:'${ownerId}'+resource_type:post`), ['post added']);
      assert.deepEqual(await events(`actor_id:'000000000000000000000000'`), []);
      assert.deepEqual(await events(`created_at:<'2000-01-01 00:00:00'`), []);
    });

    it('includes the staff user who acted', async function () {
      const tag = await addTag('By a user');

      const { actions } = await browse(
        `filter=${encodeURIComponent(`resource_id:'${tag.id}'`)}&include=actor`,
      );

      const { body } = await agent.get('users/me/').expectStatus(200);
      const [me] = body.users;
      assert.deepEqual(actions[0].actor, {
        id: me.id,
        name: me.name,
        slug: me.slug,
        image: me.profile_image,
      });
    });

    it('includes the integration that acted', async function () {
      await agent.useZapierAdminAPIKey();
      const tag = await addTag('By an integration');
      await dbUtils.truncate('rate_limits');
      await agent.loginAsOwner();

      const { actions } = await browse(
        `filter=${encodeURIComponent(`resource_id:'${tag.id}'`)}&include=actor`,
      );

      assert.equal(actions[0].actor_type, 'integration');
      assert.deepEqual(Object.keys(actions[0].actor ?? {}).sort(), ['id', 'image', 'name', 'slug']);
      assert.equal(actions[0].actor?.id, actions[0].actor_id);
      assert.equal(actions[0].actor?.slug, 'zapier');
    });

    it('includes the resource an action is about, until the resource is deleted', async function () {
      const tag = await addTag('Included');
      const filter = `filter=${encodeURIComponent(`resource_id:'${tag.id}'`)}&include=resource`;

      const before = await browse(filter);
      assert.deepEqual(before.actions[0].resource, {
        id: tag.id,
        slug: tag.slug,
        name: 'Included',
        image: null,
      });

      await agent.delete(`tags/${tag.id}/`).expectStatus(204);

      await assertActions(agent, { resourceType: 'tag', resourceId: tag.id }, [
        { event: 'added', resource: {} },
        { event: 'deleted', resource: {} },
      ]);
    });

    it('returns only the fields asked for', async function () {
      const tag = await addTag('Some fields');
      const filter = `filter=${encodeURIComponent(`resource_id:'${tag.id}'`)}`;

      const { actions } = await browse(`${filter}&fields=event,resource_type`);

      assert.deepEqual(actions, [{ event: 'added', resource_type: 'tag' }]);
    });

    it('is not open to a contributor', async function () {
      await dbUtils.truncate('rate_limits');
      await agent.loginAsContributor();
      try {
        await agent.get('actions/').expectStatus(403);
      } finally {
        await dbUtils.truncate('rate_limits');
        await agent.loginAsOwner();
      }
    });
  });

  describe('Actions written by models', function () {
    it('logs a post being added, edited and deleted, keeping its title', async function () {
      const post = await addPost('A logged post');
      await agent
        .put(`posts/${post.id}/`)
        .body({ posts: [{ title: 'A renamed post', updated_at: post.updated_at }] })
        .expectStatus(200);
      await agent.delete(`posts/${post.id}/`).expectStatus(204);

      await assertActions(agent, { resourceType: 'post', resourceId: post.id }, [
        { event: 'added', actor: owner, context: { type: 'post', primary_name: 'A logged post' } },
        {
          event: 'edited',
          actor: owner,
          context: { type: 'post', primary_name: 'A renamed post' },
        },
        {
          event: 'deleted',
          actor: owner,
          context: { type: 'post', primary_name: 'A renamed post' },
        },
      ]);
    });

    it('logs a page as a post whose context says it is a page', async function () {
      const { body } = await agent
        .post('pages/')
        .body({ pages: [{ title: 'A logged page' }] })
        .expectStatus(201);
      const page = body.pages[0];

      await assertActions(agent, { resourceType: 'post', resourceId: page.id }, [
        {
          event: 'added',
          actor: owner,
          context: { type: 'page', primary_name: 'A logged page' },
          resource: { id: page.id, title: 'A logged page', slug: 'a-logged-page', image: null },
        },
      ]);
    });

    it('logs a setting being edited, with its key and group', async function () {
      await agent
        .put('settings/')
        .body({ settings: [{ key: 'title', value: 'A logged title' }] })
        .expectStatus(200);

      await assertActions(agent, { resourceType: 'setting' }, [
        { event: 'edited', actor: owner, context: { key: 'title', group: 'site' } },
      ]);
    });

    it('logs a bulk edit of several posts once, with how many', async function () {
      const first = await addPost('Bulk one');
      const second = await addPost('Bulk two');

      await agent
        .put(`posts/bulk/?filter=${encodeURIComponent(`id:['${first.id}','${second.id}']`)}`)
        .body({ bulk: { action: 'feature' } })
        .expectStatus(200);

      await assertActions(agent, { resourceType: 'post', resourceId: null }, [
        {
          event: 'edited',
          resourceId: null,
          actor: owner,
          context: { count: 2, action_name: 'featured', type: 'post' },
        },
      ]);
    });
  });

  describe('Actions written by services', function () {
    it('logs a gift link being added and reset, about the link’s post', async function () {
      const post = await addPost('A gifted post');
      await agent.put(`posts/${post.id}/gift_links/`).expectStatus(200);
      await agent.post(`posts/${post.id}/gift_links/`).expectStatus(200);

      const resource = { id: post.id, title: 'A gifted post', slug: 'a-gifted-post', image: null };
      await assertActions(agent, { resourceType: 'gift_link', resourceId: post.id }, [
        { event: 'added', actor: owner, context: null, resource },
        { event: 'edited', actor: owner, context: { action_name: 'reset' }, resource },
      ]);
    });

    it('logs a custom field being added, about the field', async function () {
      mockManager.mockLabsEnabled('membersCustomFields');
      const { body } = await agent
        .post('members/metafields/custom/')
        .body({ members_metafields: [{ type: 'short_text', name: 'Company' }] })
        .expectStatus(201);
      const field = body.members_metafields[0];

      const [action] = await assertActions(agent, { resourceType: 'member_custom_field' }, [
        { event: 'added', actor: owner, context: { primary_name: 'Company', key: field.key } },
      ]);
      assert.deepEqual(action.resource, { id: action.resource_id, name: 'Company' });

      await models.Base.knex('members_metafields').del();
    });

    it('logs the Stripe Checkout settings being saved, about the settings', async function () {
      mockManager.mockLabsDisabled('stripeCheckoutCollection');
      await agent
        .put('stripe/checkout/config/')
        .body({ checkout_config: [{ design: { customize: false } }] })
        .expectStatus(200);

      const [action] = await assertActions(agent, { resourceType: 'stripe_checkout_config' }, [
        { event: 'edited', actor: owner, context: { primary_name: 'Stripe Checkout' } },
      ]);
      assert.deepEqual(action.resource, { id: action.resource_id, slug: 'default' });

      await models.Base.knex('stripe_checkout_config').del();
    });
  });
});
