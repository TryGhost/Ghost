import {afterAll, afterEach, beforeAll, describe, it} from 'vitest';
import assert from 'node:assert/strict';
import errors from '@tryghost/errors';
import {GiftLinksService} from '../../../core/server/services/gift-links/service';
import type {GiftLink} from '../../../core/server/services/gift-links/models';

const testUtils = require('../../utils');
const models = require('../../../core/server/models');

const MISSING_POST_ID = '0123456789abcdef01234567';

describe('GiftLinksService (integration)', function () {
    let postId: string;
    let otherPostId: string;
    let service: GiftLinksService;

    const liveLinks = async (id: string): Promise<GiftLink[]> => (await service.getPost(id)).giftLinks;

    afterAll(testUtils.teardownDb);

    beforeAll(async function () {
        await testUtils.teardownDb();
        await testUtils.setup('users:roles', 'posts')();
        postId = testUtils.DataGenerator.Content.posts[0].id;
        otherPostId = testUtils.DataGenerator.Content.posts[1].id;
        service = new GiftLinksService({knex: models.Base.knex});
    });

    afterEach(async function () {
        await models.Base.knex('post_gift_links').del();
        await models.Base.knex('gift_links').del();
    });

    describe('getPost', function () {
        it('returns the post with no links when none exists', async function () {
            assert.deepEqual(await liveLinks(postId), []);
        });

        it('throws NotFound for a post that does not exist', async function () {
            await assert.rejects(
                () => service.getPost(MISSING_POST_ID),
                (err: unknown) => err instanceof errors.NotFoundError
            );
        });
    });

    describe('ensure', function () {
        it('mints a live link with a token when none exists', async function () {
            const post = await service.ensure(postId);

            assert.equal(post.giftLinks.length, 1, 'a link should be created');
            assert.ok(post.giftLinks[0].token, 'token should be set');
            assert.equal(post.giftLinks[0].redeemedCount, 0);
            assert.equal(post.giftLinks[0].lastRedeemedAt, null);
            assert.equal((await liveLinks(postId)).length, 1);
        });

        it('is idempotent: a repeat ensure returns the same live link', async function () {
            const first = await service.ensure(postId);
            const second = await service.ensure(postId);

            assert.equal(first.giftLinks[0]?.token, second.giftLinks[0]?.token);
            assert.equal((await liveLinks(postId)).length, 1);
        });

        it('throws NotFound for a post that does not exist', async function () {
            await assert.rejects(
                () => service.ensure(MISSING_POST_ID),
                (err: unknown) => err instanceof errors.NotFoundError
            );
        });

        it('keeps exactly one live link under concurrent calls', async function () {
            const [a, b] = await Promise.all([
                service.ensure(postId),
                service.ensure(postId)
            ]);

            assert.ok(a.giftLinks[0] && b.giftLinks[0]);
            assert.equal((await liveLinks(postId)).length, 1);
        });
    });

    describe('create', function () {
        it('replaces the live link with a fresh token', async function () {
            const original = await service.ensure(postId);
            const created = await service.create(postId);

            assert.notEqual(created.giftLinks[0]?.token, original.giftLinks[0]?.token);
            const live = await liveLinks(postId);
            assert.equal(live.length, 1);
            assert.equal(live[0]?.token, created.giftLinks[0]?.token);
        });

        it('starts the new link with zeroed counters', async function () {
            const original = await service.ensure(postId);
            await service.recordRedemption(original.giftLinks[0]!.token);
            await service.recordRedemption(original.giftLinks[0]!.token);

            const created = await service.create(postId);
            assert.equal(created.giftLinks[0]?.redeemedCount, 0);
            assert.equal(created.giftLinks[0]?.lastRedeemedAt, null);
        });

        it('mints a link even when none existed', async function () {
            const created = await service.create(postId);
            assert.equal((await liveLinks(postId)).length, 1);
            assert.ok(created.giftLinks[0]?.token);
        });

        it('throws NotFound for a post that does not exist', async function () {
            await assert.rejects(
                () => service.create(MISSING_POST_ID),
                (err: unknown) => err instanceof errors.NotFoundError
            );
        });
    });

    describe('getPostByToken', function () {
        it('resolves a live token, and stops resolving once replaced', async function () {
            const original = await service.ensure(postId);
            const token = original.giftLinks[0]!.token;

            const found = await service.getPostByToken(token);
            assert.equal(found?.giftLinks[0]?.token, token);

            await service.create(postId);
            assert.equal(await service.getPostByToken(token), null);
        });

        it('returns null for unknown and empty tokens', async function () {
            assert.equal(await service.getPostByToken('nope'), null);
            assert.equal(await service.getPostByToken(''), null);
        });
    });

    describe('removeAll', function () {
        it('drops every live link across posts and returns the count', async function () {
            await service.ensure(postId);
            await service.ensure(otherPostId);

            const removed = await service.removeAll();

            assert.equal(removed, 2);
            assert.deepEqual(await liveLinks(postId), []);
            assert.deepEqual(await liveLinks(otherPostId), []);
        });
    });

    describe('recordRedemption', function () {
        it('atomically increments the counter and stamps last_redeemed_at, keyed by token', async function () {
            const post = await service.ensure(postId);
            const token = post.giftLinks[0]!.token;

            assert.equal(await service.recordRedemption(token), 1);
            assert.equal(await service.recordRedemption(token), 1);

            const reloaded = await service.getPostByToken(token);
            assert.equal(reloaded?.giftLinks[0]?.redeemedCount, 2);
            assert.notEqual(reloaded?.giftLinks[0]?.lastRedeemedAt, null);
        });

        it('counts a read against a since-replaced token (history is retained)', async function () {
            const original = await service.ensure(postId);
            const token = original.giftLinks[0]!.token;
            await service.create(postId);

            assert.equal(await service.recordRedemption(token), 1);
        });

        it('affects no rows for an unknown token', async function () {
            assert.equal(await service.recordRedemption('unknown-token'), 0);
        });
    });

    describe('the <=1-live-link-per-post invariant (database-enforced)', function () {
        it('rejects a second live association for the same post', async function () {
            await service.ensure(postId);

            await models.Base.knex('gift_links').insert({
                token: 'second-live-token', post_id: postId, redeemed_count: 0, created_at: new Date()
            });
            await assert.rejects(
                models.Base.knex('post_gift_links').insert({
                    post_id: postId, gift_link_token: 'second-live-token', created_at: new Date()
                }),
                // SQLite: "UNIQUE constraint failed"; MySQL: "Duplicate entry ... for key"
                /unique|duplicate/i
            );
        });
    });
});
