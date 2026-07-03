import {afterAll, afterEach, beforeAll, describe, it} from 'vitest';
import assert from 'node:assert/strict';
import sinon from 'sinon';
import logging from '@tryghost/logging';
import errors from '@tryghost/errors';
import {GiftLinksService, type RequestContext} from '../../../core/server/services/gift-links/service';
import type {GiftLink} from '../../../core/server/services/gift-links/models';

const testUtils = require('../../utils');
const models = require('../../../core/server/models');

const MISSING_POST_ID = '0123456789abcdef01234567';
const CTX: RequestContext = {actor: {id: 'test-actor-id', type: 'user'}};

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
        service = new GiftLinksService({
            knex: models.Base.knex,
            Action: models.Action
        });
    });

    afterEach(async function () {
        sinon.restore();
        await models.Base.knex('post_gift_links').del();
        await models.Base.knex('gift_links').del();
        await models.Base.knex('actions').where('resource_type', 'gift_link').del();
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
            const post = await service.ensure(CTX, postId);

            assert.equal(post.giftLinks.length, 1, 'a link should be created');
            assert.ok(post.giftLinks[0].token, 'token should be set');
            assert.equal((await liveLinks(postId)).length, 1);
        });

        it('is idempotent: a repeat ensure returns the same live link', async function () {
            const first = await service.ensure(CTX, postId);
            const second = await service.ensure(CTX, postId);

            assert.equal(first.giftLinks[0]?.token, second.giftLinks[0]?.token);
            assert.equal((await liveLinks(postId)).length, 1);
        });

        it('throws NotFound for a post that does not exist', async function () {
            await assert.rejects(
                () => service.ensure(CTX, MISSING_POST_ID),
                (err: unknown) => err instanceof errors.NotFoundError
            );
        });

        it('keeps exactly one live link under concurrent calls', async function () {
            const [a, b] = await Promise.all([
                service.ensure(CTX, postId),
                service.ensure(CTX, postId)
            ]);

            assert.ok(a.giftLinks[0] && b.giftLinks[0]);
            assert.equal((await liveLinks(postId)).length, 1);
        });
    });

    describe('create', function () {
        it('replaces the live link with a fresh token', async function () {
            const original = await service.ensure(CTX, postId);
            const created = await service.create(CTX, postId);

            assert.notEqual(created.giftLinks[0]?.token, original.giftLinks[0]?.token);
            const live = await liveLinks(postId);
            assert.equal(live.length, 1);
            assert.equal(live[0]?.token, created.giftLinks[0]?.token);
        });

        it('mints a link even when none existed', async function () {
            const created = await service.create(CTX, postId);
            assert.equal((await liveLinks(postId)).length, 1);
            assert.ok(created.giftLinks[0]?.token);
        });

        it('throws NotFound for a post that does not exist', async function () {
            await assert.rejects(
                () => service.create(CTX, MISSING_POST_ID),
                (err: unknown) => err instanceof errors.NotFoundError
            );
        });
    });

    describe('getPostByToken', function () {
        it('resolves a live token, and stops resolving once replaced', async function () {
            const original = await service.ensure(CTX, postId);
            const token = original.giftLinks[0]!.token;

            const found = await service.getPostByToken(token);
            assert.equal(found?.giftLinks[0]?.token, token);

            await service.create(CTX, postId);
            assert.equal(await service.getPostByToken(token), null);
        });

        it('returns null for unknown and empty tokens', async function () {
            assert.equal(await service.getPostByToken('nope'), null);
            assert.equal(await service.getPostByToken(''), null);
        });
    });

    describe('isValidTokenForPost', function () {
        it('is true only for a live token bound to the given post', async function () {
            const post = await service.ensure(CTX, postId);
            const token = post.giftLinks[0]!.token;

            assert.equal(await service.isValidTokenForPost(token, postId), true);

            // Defence in depth: a token for one post must not validate another.
            assert.equal(await service.isValidTokenForPost(token, otherPostId), false);

            // Once replaced, the old token no longer validates.
            await service.create(CTX, postId);
            assert.equal(await service.isValidTokenForPost(token, postId), false);
        });

        it('is false for unknown and empty tokens', async function () {
            assert.equal(await service.isValidTokenForPost('nope', postId), false);
            assert.equal(await service.isValidTokenForPost('', postId), false);
        });
    });

    describe('removeAll', function () {
        it('drops every live link across posts and returns the count', async function () {
            await service.ensure(CTX, postId);
            await service.ensure(CTX, otherPostId);

            const removed = await service.removeAll(CTX);

            assert.equal(removed, 2);
            assert.deepEqual(await liveLinks(postId), []);
            assert.deepEqual(await liveLinks(otherPostId), []);
        });
    });

    describe('the <=1-live-link-per-post invariant (database-enforced)', function () {
        it('rejects a second live association for the same post', async function () {
            await service.ensure(CTX, postId);

            await models.Base.knex('gift_links').insert({
                token: 'second-live-token', post_id: postId, created_at: new Date()
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

    describe('action recording', function () {
        it('does not fail the command when recording the action throws', async function () {
            const failing = new GiftLinksService({
                knex: models.Base.knex,
                Action: {add: async () => {
                    throw new Error('action write failed');
                }}
            });

            // recordAction() swallows the failure and logs it. Stub the logger
            // so we can assert that path fired instead of spamming stdout.
            const errorLog = sinon.stub(logging, 'error');

            await assert.doesNotReject(() => failing.create(CTX, postId));

            sinon.assert.calledOnce(errorLog);
            assert.equal((await liveLinks(postId)).length, 1, 'the gift link is still created');
        });
    });
});
