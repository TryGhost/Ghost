const assert = require('node:assert/strict');
const testUtils = require('../../utils');
const models = require('../../../core/server/models');
const GiftLinksService = require('../../../core/server/services/gift-links/gift-links-service');

async function countLinks(where) {
    const rows = await models.Base.knex('gift_links').where(where).select('id');
    return rows.length;
}

describe('GiftLinksService (integration)', function () {
    let context, postId, otherPostId, draftPostId, service;

    before(testUtils.teardownDb);
    before(testUtils.setup('users:roles', 'posts'));
    after(testUtils.teardownDb);

    before(function () {
        context = testUtils.context.admin;
        postId = testUtils.DataGenerator.Content.posts[0].id;
        otherPostId = testUtils.DataGenerator.Content.posts[1].id;
        // posts[3] is a draft — used to prove the service is status-agnostic
        draftPostId = testUtils.DataGenerator.Content.posts[3].id;
        service = new GiftLinksService({models});
    });

    // Each test starts from a clean slate of gift links (the fixture posts persist).
    afterEach(async function () {
        await models.Base.knex('gift_links').del();
    });

    describe('ensure', function () {
        it('creates an active link with a token when none exists', async function () {
            const link = await service.ensure(postId, {context});

            assert.equal(link.get('post_id'), postId);
            assert.equal(link.get('status'), 'active');
            assert.ok(link.get('token'), 'token should be set');
            assert.equal(link.get('redeemed_count'), 0);
            assert.equal(await countLinks({post_id: postId}), 1);
        });

        it('is idempotent — returns the same active link, no duplicate row', async function () {
            const first = await service.ensure(postId, {context});
            const second = await service.ensure(postId, {context});

            assert.equal(first.get('id'), second.get('id'));
            assert.equal(first.get('token'), second.get('token'));
            assert.equal(await countLinks({post_id: postId}), 1);
        });

        it('throws for a post that does not exist', async function () {
            await assert.rejects(service.ensure('0123456789abcdef01234567', {context}));
        });

        it('works for a non-published post under a non-internal context (status-agnostic)', async function () {
            // The Post model injects status:'published' for non-internal contexts;
            // the service must bypass that so it can lock/ensure links for any post.
            const link = await service.ensure(draftPostId, {context});
            assert.equal(link.get('post_id'), draftPostId);
            assert.equal(link.get('status'), 'active');
        });
    });

    describe('reset', function () {
        it('deactivates the old link and mints a new active one with a different token', async function () {
            const original = await service.ensure(postId, {context});
            const renewed = await service.reset(postId, {context});

            assert.notEqual(renewed.get('token'), original.get('token'));
            assert.equal(renewed.get('status'), 'active');

            const old = await models.GiftLink.findOne({id: original.get('id')}, {require: true});
            assert.equal(old.get('status'), 'inactive');

            assert.equal(await countLinks({post_id: postId, status: 'active'}), 1);
            assert.equal(await countLinks({post_id: postId}), 2, 'history is retained');
        });

        it('starts the new link with zeroed counters', async function () {
            const original = await service.ensure(postId, {context});
            // Simulate reads accruing on the original link
            await models.Base.knex('gift_links')
                .where({id: original.get('id')})
                .update({redeemed_count: 42, last_redeemed_at: new Date()});

            const renewed = await service.reset(postId, {context});
            assert.equal(renewed.get('redeemed_count'), 0);
            assert.equal(renewed.get('last_redeemed_at'), null);
        });

        it('mints a fresh link even when none existed (reset implies ensure)', async function () {
            const renewed = await service.reset(postId, {context});
            assert.equal(renewed.get('status'), 'active');
            assert.equal(await countLinks({post_id: postId, status: 'active'}), 1);
        });
    });

    describe('resetAll', function () {
        it('deactivates active links across all posts and returns the count', async function () {
            await service.ensure(postId, {context});
            await service.ensure(otherPostId, {context});

            const deactivated = await service.resetAll({context});

            assert.equal(deactivated, 2);
            assert.equal(await countLinks({status: 'active'}), 0);
            assert.equal(await countLinks({status: 'inactive'}), 2);
        });

        it('is a no-op (zero) when there are no active links', async function () {
            const deactivated = await service.resetAll({context});
            assert.equal(deactivated, 0);
        });
    });

    describe('getActive / getActiveByToken', function () {
        it('getActive returns null when there is no active link', async function () {
            const active = await service.getActive(postId, {context});
            assert.equal(active, null);
        });

        it('getActive returns the active link once ensured', async function () {
            const link = await service.ensure(postId, {context});
            const active = await service.getActive(postId, {context});
            assert.equal(active.get('id'), link.get('id'));
        });

        it('getActiveByToken finds an active token but ignores deactivated/unknown tokens', async function () {
            const original = await service.ensure(postId, {context});
            const originalToken = original.get('token');

            const found = await service.getActiveByToken(originalToken, {context});
            assert.equal(found.get('id'), original.get('id'));

            // After a reset the old token must no longer resolve
            await service.reset(postId, {context});
            assert.equal(await service.getActiveByToken(originalToken, {context}), null);
            assert.equal(await service.getActiveByToken('definitely-not-a-real-token', {context}), null);
            assert.equal(await service.getActiveByToken('', {context}), null);
        });
    });
});
