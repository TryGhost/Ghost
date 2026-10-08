import { afterAll, afterEach, beforeAll, describe, it } from 'vitest';
import assert from 'node:assert/strict';
import { GiftLinksService } from '../../../core/server/services/gift-links/service';
import type { RequestContext } from '../../../core/server/lib/actor';
import { createChangeEvents } from '../../../core/server/lib/change-events';
import type { GiftLinkEvent } from '../../../core/server/services/gift-links/events';
import type { GiftLink } from '../../../core/server/services/gift-links/models';

const testUtils = require('../../utils');
const models = require('../../../core/server/models');

const CTX: RequestContext = { actor: { id: 'test-actor-id', type: 'user' } };

// The HTTP suites own the request-level contract (e2e-api/admin: CRUD, permissions, 404s,
// action history; e2e-frontend: ?gift access, redirects, analytics). This suite pins the
// service-level behaviours that are invisible or non-deterministic through HTTP: revocation
// of a replaced token, idempotent ensure, removeAll's cross-post scope, and the DB-enforced
// one-live-link invariant.
describe('GiftLinksService (integration)', function () {
  let postId: string;
  let otherPostId: string;
  let service: GiftLinksService;

  const liveLinks = async (id: string): Promise<GiftLink[]> =>
    (await service.getPost(id)).giftLinks;

  afterAll(testUtils.teardownDb);

  beforeAll(async function () {
    await testUtils.teardownDb();
    await testUtils.setup('users:roles', 'posts')();
    postId = testUtils.DataGenerator.Content.posts[0].id;
    otherPostId = testUtils.DataGenerator.Content.posts[1].id;
    // Nothing reacts to the events: the HTTP suites cover the action log.
    service = new GiftLinksService({
      knex: models.Base.knex,
      events: createChangeEvents<GiftLinkEvent>(),
    });
  });

  afterEach(async function () {
    await models.Base.knex('post_gift_links').del();
    await models.Base.knex('gift_links').del();
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
});
