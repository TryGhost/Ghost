import {afterAll, afterEach, beforeAll, describe, it} from 'vitest';
import assert from 'node:assert/strict';
import errors from '@tryghost/errors';
import {GiftLinksService} from '../../../core/server/services/gift-links/service';
import type {GiftLink} from '../../../core/server/services/gift-links/model';

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
        it('returns the post with no links when none has been issued', async function () {
            assert.deepEqual(await liveLinks(postId), []);
        });

        it('throws NotFound for a post that does not exist', async function () {
            await assert.rejects(
                () => service.getPost(MISSING_POST_ID),
                (err: unknown) => err instanceof errors.NotFoundError
            );
        });
    });

    describe('issue', function () {
        it('mints a live link with a token when none exists', async function () {
            const post = await service.issue(postId);

            assert.equal(post.giftLinks.length, 1, 'a link should be issued');
            assert.ok(post.giftLinks[0].token, 'token should be set');
            assert.equal(post.giftLinks[0].redeemedCount, 0);
            assert.equal(post.giftLinks[0].lastRedeemedAt, null);
            assert.equal((await liveLinks(postId)).length, 1);
        });

        it('is idempotent: a repeat issue returns the same live link', async function () {
            const first = await service.issue(postId);
            const second = await service.issue(postId);

            assert.equal(first.giftLinks[0]?.token, second.giftLinks[0]?.token);
            assert.equal((await liveLinks(postId)).length, 1);
        });

        it('throws NotFound for a post that does not exist', async function () {
            await assert.rejects(
                () => service.issue(MISSING_POST_ID),
                (err: unknown) => err instanceof errors.NotFoundError
            );
        });

        it('keeps exactly one live link under concurrent calls', async function () {
            const [a, b] = await Promise.all([
                service.issue(postId),
                service.issue(postId)
            ]);

            assert.ok(a.giftLinks[0] && b.giftLinks[0]);
            assert.equal((await liveLinks(postId)).length, 1);
        });
    });

    describe('reissue', function () {
        it('rotates to a fresh token', async function () {
            const original = await service.issue(postId);
            const rotated = await service.reissue(postId);

            assert.notEqual(rotated.giftLinks[0]?.token, original.giftLinks[0]?.token);
            const live = await liveLinks(postId);
            assert.equal(live.length, 1);
            assert.equal(live[0]?.token, rotated.giftLinks[0]?.token);
        });

        it('starts the new link with zeroed counters', async function () {
            const original = await service.issue(postId);
            await service.recordRedemption(original.giftLinks[0]!.token);
            await service.recordRedemption(original.giftLinks[0]!.token);

            const rotated = await service.reissue(postId);
            assert.equal(rotated.giftLinks[0]?.redeemedCount, 0);
            assert.equal(rotated.giftLinks[0]?.lastRedeemedAt, null);
        });

        it('mints a link even when none existed', async function () {
            const rotated = await service.reissue(postId);
            assert.equal((await liveLinks(postId)).length, 1);
            assert.ok(rotated.giftLinks[0]?.token);
        });

        it('throws NotFound for a post that does not exist', async function () {
            await assert.rejects(
                () => service.reissue(MISSING_POST_ID),
                (err: unknown) => err instanceof errors.NotFoundError
            );
        });
    });

    describe('getPostByToken', function () {
        it('resolves a live token, and stops resolving once reissued', async function () {
            const original = await service.issue(postId);
            const token = original.giftLinks[0]!.token;

            const found = await service.getPostByToken(token);
            assert.equal(found?.giftLinks[0]?.token, token);

            await service.reissue(postId);
            assert.equal(await service.getPostByToken(token), null);
        });

        it('returns null for unknown and empty tokens', async function () {
            assert.equal(await service.getPostByToken('nope'), null);
            assert.equal(await service.getPostByToken(''), null);
        });
    });

    describe('revokeAll', function () {
        it('drops every live link across posts and returns the count', async function () {
            await service.issue(postId);
            await service.issue(otherPostId);

            const revoked = await service.revokeAll();

            assert.equal(revoked, 2);
            assert.deepEqual(await liveLinks(postId), []);
            assert.deepEqual(await liveLinks(otherPostId), []);
        });
    });

    describe('recordRedemption', function () {
        it('atomically increments the counter and stamps last_redeemed_at, keyed by token', async function () {
            const post = await service.issue(postId);
            const token = post.giftLinks[0]!.token;

            assert.equal(await service.recordRedemption(token), 1);
            assert.equal(await service.recordRedemption(token), 1);

            const reloaded = await service.getPostByToken(token);
            assert.equal(reloaded?.giftLinks[0]?.redeemedCount, 2);
            assert.notEqual(reloaded?.giftLinks[0]?.lastRedeemedAt, null);
        });

        it('counts a read against a since-reissued token (history is retained)', async function () {
            const original = await service.issue(postId);
            const token = original.giftLinks[0]!.token;
            await service.reissue(postId);

            assert.equal(await service.recordRedemption(token), 1);
        });

        it('affects no rows for an unknown token', async function () {
            assert.equal(await service.recordRedemption('unknown-token'), 0);
        });
    });

    describe('revoked_at (deactivation history)', function () {
        const revokedAt = async (token: string): Promise<Date | null> => (await models.Base.knex('gift_links').where({token}).first()).revoked_at;

        it('stamps the replaced link on reissue and leaves the new one live', async function () {
            const original = await service.issue(postId);
            const rotated = await service.reissue(postId);

            assert.notEqual(await revokedAt(original.giftLinks[0]!.token), null, 'replaced link is stamped');
            assert.equal(await revokedAt(rotated.giftLinks[0]!.token), null, 'new link stays live');
        });

        it('stamps every link that revokeAll deactivates', async function () {
            const a = await service.issue(postId);
            const b = await service.issue(otherPostId);
            await service.revokeAll();

            assert.notEqual(await revokedAt(a.giftLinks[0]!.token), null);
            assert.notEqual(await revokedAt(b.giftLinks[0]!.token), null);
        });
    });

    describe('the <=1-live-link-per-post invariant (database-enforced)', function () {
        it('rejects a second live association for the same post', async function () {
            await service.issue(postId);

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
