import assert from 'node:assert/strict';
import {GiftLinksService} from '../../../core/server/services/gift-links/gift-links-service';
import {GiftLinkBookshelfRepository} from '../../../core/server/services/gift-links/gift-link-bookshelf-repository';

const testUtils = require('../../utils');
const models = require('../../../core/server/models');

async function countLinks(where: Record<string, unknown>) {
    const rows = await models.Base.knex('gift_links').where(where).select('id');
    return rows.length;
}

describe('GiftLinksService (integration)', function () {
    let context: unknown;
    let postId: string;
    let otherPostId: string;
    let draftPostId: string;
    let service: GiftLinksService;
    let repository: GiftLinkBookshelfRepository;

    after(testUtils.teardownDb);

    before(async function () {
        await testUtils.teardownDb();
        await testUtils.setup('users:roles', 'posts')();

        context = testUtils.context.admin;
        postId = testUtils.DataGenerator.Content.posts[0].id;
        otherPostId = testUtils.DataGenerator.Content.posts[1].id;
        // posts[3] is a draft — used to prove the service is status-agnostic
        draftPostId = testUtils.DataGenerator.Content.posts[3].id;

        repository = new GiftLinkBookshelfRepository({
            GiftLinkModel: models.GiftLink,
            knex: models.Base.knex
        });
        service = new GiftLinksService({giftLinkRepository: repository});
    });

    // Each test starts from a clean slate of gift links (the fixture posts persist).
    afterEach(async function () {
        await models.Base.knex('gift_links').del();
    });

    describe('upsert', function () {
        it('creates an active link with a token when none exists', async function () {
            const link = await service.upsert(postId, {context});

            assert.equal(link.post_id, postId);
            assert.equal(link.status, 'active');
            assert.ok(link.token, 'token should be set');
            assert.equal(link.redeemed_count, 0);
            assert.equal(await countLinks({post_id: postId}), 1);
        });

        it('is idempotent — returns the same active link, no duplicate row', async function () {
            const first = await service.upsert(postId, {context});
            const second = await service.upsert(postId, {context});

            assert.equal(first.id, second.id);
            assert.equal(first.token, second.token);
            assert.equal(await countLinks({post_id: postId}), 1);
        });

        it('throws for a post that does not exist', async function () {
            await assert.rejects(service.upsert('0123456789abcdef01234567', {context}));
        });

        it('works for a non-published post (status-agnostic)', async function () {
            // Existence is checked against the posts table directly (no status
            // filter) and the FK backs it, so links mint for any existing post.
            const link = await service.upsert(draftPostId, {context});
            assert.equal(link.post_id, draftPostId);
            assert.equal(link.status, 'active');
        });
    });

    describe('reset', function () {
        it('deactivates the old link and mints a new active one with a different token', async function () {
            const original = await service.upsert(postId, {context});
            const renewed = await service.reset(postId, {context});

            assert.notEqual(renewed.token, original.token);
            assert.equal(renewed.status, 'active');

            const old = await models.GiftLink.findOne({id: original.id}, {require: true});
            assert.equal(old.get('status'), 'inactive');

            assert.equal(await countLinks({post_id: postId, status: 'active'}), 1);
            assert.equal(await countLinks({post_id: postId}), 2, 'history is retained');
        });

        it('starts the new link with zeroed counters', async function () {
            const original = await service.upsert(postId, {context});
            // Simulate reads accruing on the original link
            await models.Base.knex('gift_links')
                .where({id: original.id})
                .update({redeemed_count: 42, last_redeemed_at: new Date()});

            const renewed = await service.reset(postId, {context});
            assert.equal(renewed.redeemed_count, 0);
            assert.equal(renewed.last_redeemed_at, null);
        });

        it('mints a fresh link even when none existed (reset implies create)', async function () {
            const renewed = await service.reset(postId, {context});
            assert.equal(renewed.status, 'active');
            assert.equal(await countLinks({post_id: postId, status: 'active'}), 1);
        });
    });

    describe('resetAll', function () {
        it('deactivates active links across all posts and returns the count', async function () {
            await service.upsert(postId, {context});
            await service.upsert(otherPostId, {context});

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

    describe('recordRead', function () {
        it('increments redeemed_count and stamps last_redeemed_at', async function () {
            const link = await service.upsert(postId, {context});
            assert.equal(link.redeemed_count, 0);
            assert.equal(link.last_redeemed_at, null);

            const affected = await service.recordRead(link.id);
            assert.equal(affected, 1);

            const reloaded = await models.GiftLink.findOne({id: link.id}, {require: true});
            assert.equal(reloaded.get('redeemed_count'), 1);
            assert.notEqual(reloaded.get('last_redeemed_at'), null);

            await service.recordRead(link.id);
            const again = await models.GiftLink.findOne({id: link.id}, {require: true});
            assert.equal(again.get('redeemed_count'), 2);
        });

        it('affects no rows for an unknown link id', async function () {
            const affected = await service.recordRead('0123456789abcdef01234567');
            assert.equal(affected, 0);
        });
    });

    describe('getActive / getActiveByToken', function () {
        it('getActive returns null when there is no active link', async function () {
            const active = await service.getActive(postId, {context});
            assert.equal(active, null);
        });

        it('getActive returns the active link once created', async function () {
            const link = await service.upsert(postId, {context});
            const active = await service.getActive(postId, {context});
            assert.equal(active!.id, link.id);
        });

        it('getActiveByToken finds an active token but ignores deactivated/unknown tokens', async function () {
            const original = await service.upsert(postId, {context});
            const originalToken = original.token;

            const found = await service.getActiveByToken(originalToken, {context});
            assert.equal(found!.id, original.id);

            // After a reset the old token must no longer resolve
            await service.reset(postId, {context});
            assert.equal(await service.getActiveByToken(originalToken, {context}), null);
            assert.equal(await service.getActiveByToken('definitely-not-a-real-token', {context}), null);
            assert.equal(await service.getActiveByToken('', {context}), null);
        });
    });

    describe('soft <=1-active convergence', function () {
        it('the sweep keeps only the most-recent active link (and never zero)', async function () {
            // Simulate the race artefact: two active links for one post.
            await models.Base.knex('gift_links').insert([
                {id: '1'.repeat(24), post_id: postId, token: 'tok-older', status: 'active', redeemed_count: 0, created_at: new Date('2026-01-01T00:00:00Z')},
                {id: '2'.repeat(24), post_id: postId, token: 'tok-newer', status: 'active', redeemed_count: 0, created_at: new Date('2026-02-01T00:00:00Z')}
            ]);
            assert.equal(await countLinks({post_id: postId, status: 'active'}), 2);

            await repository.deactivateAllButMostRecent(postId);

            // Exactly one survives — never zero — and it's the most-recent.
            assert.equal(await countLinks({post_id: postId, status: 'active'}), 1);
            const active = await service.getActive(postId, {context});
            assert.equal(active!.token, 'tok-newer', 'keeps the most-recent active link');
        });
    });
});
