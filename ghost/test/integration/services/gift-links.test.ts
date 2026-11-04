import { afterAll, afterEach, beforeAll, describe, it } from 'vitest';
import assert from 'node:assert/strict';
import sinon from 'sinon';
import logging from '@tryghost/logging';
import { GiftLinksService } from '../../../core/server/services/gift-links/service';
import { ActionLog } from '../../../core/server/lib/action-log/action-log';
import type { RequestContext } from '../../../core/server/lib/actor';
import type { GiftLink } from '../../../core/server/services/gift-links/models';

const testUtils = require('../../utils');
const models = require('../../../core/server/models');

const CTX: RequestContext = { actor: { id: 'test-actor-id', type: 'user' } };

// The HTTP suites own the request-level contract (e2e-api/admin: CRUD, permissions, 404s,
// action history; e2e-frontend: ?gift access, redirects, analytics). This suite pins the
// service-level behaviours that are invisible or non-deterministic through HTTP: revocation
// of a replaced token, idempotent ensure, removeAll's cross-post scope, the DB-enforced
// one-live-link invariant, and the best-effort action-recording composition init() wires up.
describe('GiftLinksService (integration)', function () {
  let postId: string;
  let otherPostId: string;
  let service: GiftLinksService;

  const liveLinks = async (id: string): Promise<GiftLink[]> =>
    (await service.getPost(id)).giftLinks;
  const giftLinkActions = () => models.Base.knex('actions').where('resource_type', 'gift_link');

  afterAll(testUtils.teardownDb);

  beforeAll(async function () {
    await testUtils.teardownDb();
    await testUtils.setup('users:roles', 'posts')();
    postId = testUtils.DataGenerator.Content.posts[0].id;
    otherPostId = testUtils.DataGenerator.Content.posts[1].id;
    // Mirror init()'s wiring.
    service = new GiftLinksService({
      knex: models.Base.knex,
      actionLog: new ActionLog({ knex: models.Base.knex, logging }),
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

  it('names the post in the actions it records, in the same transaction', async function () {
    await service.ensure(CTX, postId);
    await service.create(CTX, postId);

    const { title } = await models.Base.knex('posts').where('id', postId).first('title');
    const contexts = (await giftLinkActions().orderBy('id')).map(
      ({ event, context }: { event: string; context: string }) => ({
        event,
        context: JSON.parse(context),
      }),
    );
    assert.deepEqual(contexts, [
      { event: 'added', context: { primary_name: title } },
      { event: 'edited', context: { primary_name: title, action_name: 'reset' } },
    ]);
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

  it('removeAll drops every live link across posts and returns the count', async function () {
    await service.ensure(CTX, postId);
    await service.ensure(CTX, otherPostId);

    const removed = await service.removeAll(CTX);

    assert.equal(removed, 2);
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
      const actionsBefore = (await giftLinkActions()).length;
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
      assert.equal((await giftLinkActions()).length, actionsBefore);
      if (existing) {
        assert.equal((await service.getPostByToken(existing.giftLinks[0]!.token))?.id, postId);
      }

      // The failed command must not leave the connection or transaction stuck.
      const recovered = await service[command](CTX, postId);
      assert.equal((await liveLinks(postId))[0]?.token, recovered.giftLinks[0]?.token);
      assert.equal((await giftLinkActions()).length, actionsBefore + 1);
    });
  }

  it('does not fail the command when recording the action throws', async function () {
    // Fail the action insert inside the command's transaction: on MySQL a failed statement
    // doesn't abort the transaction, so the link must still be committed.
    const errorLog = sinon.stub(logging, 'error');
    await models.Base.knex.raw(`
      CREATE TRIGGER fail_gift_link_action
      BEFORE INSERT ON actions FOR EACH ROW
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'action write failed'
    `);
    try {
      await assert.doesNotReject(() => service.create(CTX, postId));
    } finally {
      await models.Base.knex.raw('DROP TRIGGER fail_gift_link_action');
    }

    sinon.assert.calledOnce(errorLog);
    assert.deepEqual((errorLog.firstCall.args[0] as { event: unknown }).event, {
      name: 'action_log.write_failed',
    });
    assert.equal((await liveLinks(postId)).length, 1, 'the gift link is still created');
    assert.equal((await giftLinkActions()).length, 0);
  });
});
