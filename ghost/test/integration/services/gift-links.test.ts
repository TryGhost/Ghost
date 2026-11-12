import { afterAll, afterEach, beforeAll, describe, it } from 'vitest';
import assert from 'node:assert/strict';
import sinon from 'sinon';
import type { Knex } from 'knex';
import { GiftLinksService } from '../../../core/server/services/gift-links/service';
import { ActionsService } from '../../../core/server/services/actions/actions-service';
import type { RequestContext } from '../../../core/server/lib/actor';
import type { GiftLink } from '../../../core/server/services/gift-links/models';

const testUtils = require('../../utils');
const models = require('../../../core/server/models');
const { createLoggingFake } = require('../../utils/logging-utils');

const CTX: RequestContext = { actor: { id: 'test-actor-id', type: 'user' } };

// The HTTP suites own the request-level contract (e2e-api/admin: CRUD, permissions, 404s,
// action history; e2e-frontend: ?gift access, redirects, analytics). This suite pins the
// service-level behaviours that are invisible or non-deterministic through HTTP: revocation
// of a replaced token, idempotent ensure, removeAll's cross-post scope, the DB-enforced
// one-live-link invariant, and the action log composition init() wires up.
describe('GiftLinksService (integration)', function () {
  let postId: string;
  let otherPostId: string;
  let service: GiftLinksService;
  let logging: ReturnType<typeof import('../../utils/logging-utils').createLoggingFake>;

  const liveLinks = async (id: string): Promise<GiftLink[]> =>
    (await service.getPost(id)).giftLinks;

  const loggedActions = () => models.Base.knex('actions').where('resource_type', 'gift_link');

  afterAll(testUtils.teardownDb);

  beforeAll(async function () {
    await testUtils.teardownDb();
    await testUtils.setup('users:roles', 'posts')();
    postId = testUtils.DataGenerator.Content.posts[0].id;
    otherPostId = testUtils.DataGenerator.Content.posts[1].id;
    // Mirror init()'s wiring: every change is logged as a staff action.
    logging = createLoggingFake();
    service = new GiftLinksService({
      knex: models.Base.knex,
      reactions: new ActionsService({ logging }).giftLinks,
    });
  });

  afterEach(async function () {
    sinon.restore();
    await models.Base.knex('post_gift_links').del();
    await models.Base.knex('gift_links').del();
    await models.Base.knex('actions').where('resource_type', 'gift_link').del();
  });

  it('ensure is idempotent: a repeat ensure returns the same live token', async function () {
    const first = await service.ensure(CTX, postId);
    const second = await service.ensure(CTX, postId);

    assert.equal(second.giftLinks[0]?.token, first.giftLinks[0]?.token);
    assert.equal((await liveLinks(postId)).length, 1);
  });

  it('create mints a link even when none existed', async function () {
    const created = await service.create(CTX, postId);

    assert.ok(created.giftLinks[0]?.token);
    assert.equal((await liveLinks(postId)).length, 1);
  });

  it('a replaced token stops resolving', async function () {
    const token = (await service.ensure(CTX, postId)).giftLinks[0]!.token;
    assert.equal((await service.getPostByToken(token))?.id, postId);

    await service.create(CTX, postId);

    // The replaced token must lose access even though it stays in gift_links history.
    assert.equal(await service.getPostByToken(token), null);
  });

  it('removeAll drops every live link across posts and returns each post with the link it lost', async function () {
    const first = await service.ensure(CTX, postId);
    const second = await service.ensure(CTX, otherPostId);

    const removed = await service.removeAll(CTX);

    const byPost = (a: { id: string }, b: { id: string }) => a.id.localeCompare(b.id);
    assert.deepEqual(
      removed
        .map(({ id, giftLinks }) => ({ id, tokens: giftLinks.map(({ token }) => token) }))
        .sort(byPost),
      [first, second]
        .map(({ id, giftLinks }) => ({ id, tokens: giftLinks.map(({ token }) => token) }))
        .sort(byPost),
    );
    assert.deepEqual(await liveLinks(postId), []);
    assert.deepEqual(await liveLinks(otherPostId), []);
  });

  it('the database rejects a second live association for the same post', async function () {
    await service.ensure(CTX, postId);

    await models.Base.knex('gift_links').insert({
      token: 'second-live-token',
      post_id: postId,
      created_at: new Date(),
    });
    await assert.rejects(
      models.Base.knex('post_gift_links').insert({
        post_id: postId,
        gift_link_token: 'second-live-token',
        created_at: new Date(),
      }),
      /unique|duplicate/i,
    );
  });

  for (const command of ['ensure', 'create'] as const) {
    it(`rolls back ${command} when the live association cannot be saved`, async function () {
      const existing = command === 'create' ? await service.create(CTX, postId) : undefined;
      const before = await models.Base.knex('gift_links').where('post_id', postId);
      const previousLiveLinks = await liveLinks(postId);
      const actionsBefore = await loggedActions();
      // Fail the second write in the real transaction, after the history row
      // has been inserted. A rejected transaction stub cannot prove rollback.
      await models.Base.knex.raw(`
        CREATE TRIGGER fail_gift_link_association
        BEFORE INSERT ON post_gift_links FOR EACH ROW
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'live gift link write failed'
      `);
      try {
        await assert.rejects(service[command](CTX, postId), /live gift link write failed/);
      } finally {
        await models.Base.knex.raw('DROP TRIGGER fail_gift_link_association');
      }

      assert.deepEqual(await models.Base.knex('gift_links').where('post_id', postId), before);
      assert.deepEqual(await liveLinks(postId), previousLiveLinks);
      assert.deepEqual(await loggedActions(), actionsBefore, 'a rolled back change logs nothing');
      if (existing) {
        assert.equal((await service.getPostByToken(existing.giftLinks[0]!.token))?.id, postId);
      }

      // The failed command must not leave the connection or transaction stuck.
      const recovered = await service[command](CTX, postId);
      assert.equal((await liveLinks(postId))[0]?.token, recovered.giftLinks[0]?.token);
      assert.equal((await loggedActions()).length, actionsBefore.length + 1);
    });
  }

  it('ensure returns a link minted after the transaction it joined first read', async function () {
    await models.Base.knex.transaction(async (trx: Knex.Transaction) => {
      // On MySQL a transaction's plain reads all see the database as it was at its first one.
      await trx('posts').where('id', postId).first('id');
      const minted = await service.ensure(CTX, postId);

      const joined = await service.ensure(CTX, postId, trx);

      assert.equal(joined.giftLinks[0]?.token, minted.giftLinks[0]?.token);
    });
    assert.equal((await liveLinks(postId)).length, 1);
  });

  it('saves nothing when the action cannot be written to the action log', async function () {
    // Fail the action's own insert in the real transaction, after the link has been written.
    await models.Base.knex.raw(`
      CREATE TRIGGER fail_gift_link_action
      BEFORE INSERT ON actions FOR EACH ROW
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'action write failed'
    `);
    // The action log logs the failure before throwing it.
    logging.error.resetHistory();
    try {
      await assert.rejects(() => service.create(CTX, postId), /action write failed/);
    } finally {
      await models.Base.knex.raw('DROP TRIGGER fail_gift_link_action');
    }

    sinon.assert.calledOnceWithMatch(logging.error, {
      event: { name: 'action_log.write_failed' },
      resourceType: 'gift_link',
      resourceId: postId,
      action: 'edited',
      actorType: 'user',
      actorId: CTX.actor?.id,
    });
    assert.deepEqual(await liveLinks(postId), [], 'the gift link is rolled back');
    assert.deepEqual(await models.Base.knex('gift_links').where('post_id', postId), []);
  });

  it('fails the command and saves nothing when a reaction to its change throws', async function () {
    const failing = new GiftLinksService({
      knex: models.Base.knex,
      reactions: {
        onGiftLinkUpdated: async () => {
          throw new Error('reaction failed');
        },
      },
    });

    await assert.rejects(() => failing.ensure(CTX, postId), /reaction failed/);

    assert.deepEqual(await liveLinks(postId), [], 'the gift link is rolled back');
  });

  it('logs no action for a command with no actor', async function () {
    await service.create({ actor: null }, postId);

    assert.equal((await liveLinks(postId)).length, 1);
    assert.deepEqual(await loggedActions(), []);
  });
});
