import assert from 'node:assert/strict';
import {GiftLinkKnexRepository} from '../../../core/server/services/gift-links/gift-link-knex-repository';
import {GiftLinksService} from '../../../core/server/services/gift-links/gift-links-service';
import {Post} from '../../../core/server/services/gift-links/post';
import {generateGiftLinkToken} from '../../../core/server/services/gift-links/gift-link-token';

const testUtils = require('../../utils');
const models = require('../../../core/server/models');

describe('GiftLinks (integration)', function () {
    let postId: string;
    let otherPostId: string;
    let draftPostId: string;
    let service: GiftLinksService;
    let repository: GiftLinkKnexRepository;

    after(testUtils.teardownDb);

    before(async function () {
        await testUtils.teardownDb();
        await testUtils.setup('users:roles', 'posts')();

        postId = testUtils.DataGenerator.Content.posts[0].id;
        otherPostId = testUtils.DataGenerator.Content.posts[1].id;
        // posts[3] is a draft — proves the service is status-agnostic
        draftPostId = testUtils.DataGenerator.Content.posts[3].id;

        repository = new GiftLinkKnexRepository({knex: models.Base.knex});
        service = new GiftLinksService({repository});
    });

    // Deleting history cascades to the active pointer; clear both for a clean slate.
    afterEach(async function () {
        await models.Base.knex('gift_links_active').del();
        await models.Base.knex('gift_links').del();
    });

    async function countActive(pid: string) {
        return (await models.Base.knex('gift_links_active').where({post_id: pid})).length;
    }
    async function countHistory(pid: string) {
        return (await models.Base.knex('gift_links').where({post_id: pid})).length;
    }

    describe('issue', function () {
        it('mints a live link: one active row, one history row, zeroed counter', async function () {
            const post = await service.issue(postId);

            assert.ok(post.giftLink, 'a link is minted');
            assert.equal(post.giftLink!.redeemedCount, 0);
            assert.equal(await countActive(postId), 1);
            assert.equal(await countHistory(postId), 1);
        });

        it('is idempotent — same token, no new rows', async function () {
            const first = await service.issue(postId);
            const second = await service.issue(postId);

            assert.equal(first.giftLink!.token, second.giftLink!.token);
            assert.equal(await countActive(postId), 1);
            assert.equal(await countHistory(postId), 1);
        });

        it('works for a draft post (status-agnostic)', async function () {
            const post = await service.issue(draftPostId);
            assert.ok(post.giftLink);
        });

        it('throws for a post that does not exist', async function () {
            await assert.rejects(service.issue('0123456789abcdef01234567'));
        });
    });

    describe('reissue', function () {
        it('rotates the token, keeps one live link, retains the archived one', async function () {
            const original = await service.issue(postId);
            const renewed = await service.reissue(postId);

            assert.notEqual(renewed.giftLink!.token, original.giftLink!.token);
            assert.equal(await countActive(postId), 1, 'still exactly one live link');
            assert.equal(await countHistory(postId), 2, 'history retains the archived link');

            assert.equal(await service.getPostByToken(original.giftLink!.token), null, 'old token is no longer live');
            const live = await service.getPostByToken(renewed.giftLink!.token);
            assert.equal(live!.giftLink!.token, renewed.giftLink!.token);
        });

        it('mints a fresh link even when none existed', async function () {
            const post = await service.reissue(postId);
            assert.ok(post.giftLink);
            assert.equal(await countActive(postId), 1);
        });
    });

    describe('recordRedemption', function () {
        it('counts against the token — even after it has been archived', async function () {
            const issued = await service.issue(postId);
            const token = issued.giftLink!.token;

            assert.equal(await service.recordRedemption(token), 1);
            assert.equal((await service.getPost(postId)).giftLink!.redeemedCount, 1);

            // Reissue archives the token; a late read still records against its history row.
            await service.reissue(postId);
            assert.equal(await service.recordRedemption(token), 1, 'archived token still counts');

            // ...without touching the new live link's own counter.
            assert.equal((await service.getPost(postId)).giftLink!.redeemedCount, 0);
        });
    });

    describe('revokeAll', function () {
        it('clears every live link, returns the count, retains history', async function () {
            await service.issue(postId);
            await service.issue(otherPostId);

            assert.equal(await service.revokeAll(), 2);
            assert.equal(await countActive(postId), 0);
            assert.equal(await countActive(otherPostId), 0);
            assert.equal(await countHistory(postId), 1, 'history retained');
            assert.equal(await countHistory(otherPostId), 1);
            assert.equal((await service.getPost(postId)).giftLink, null);
        });

        it('is a no-op (zero) when there are no live links', async function () {
            assert.equal(await service.revokeAll(), 0);
        });
    });

    describe('create() convergence (no clobber)', function () {
        it('converges on the existing link instead of replacing it', async function () {
            // A second create() that didn't see the live link must converge on the winner
            // (hit UNIQUE(post_id), roll back), not clobber it or leave an orphan history row.
            const winner = await service.issue(postId);
            const racing = await repository.create(new Post(postId).issue(generateGiftLinkToken()));

            assert.equal(racing.giftLink!.token, winner.giftLink!.token, 'returns the winner, not a new token');
            assert.equal(await countActive(postId), 1);
            assert.equal(await countHistory(postId), 1, 'the rolled-back insert leaves no orphan history row');
        });
    });

    describe('<=1 live link per post (DB invariant)', function () {
        it('rejects a second active row for the same post', async function () {
            await service.issue(postId);

            const knex = models.Base.knex;
            await knex('gift_links').insert({
                id: 'a'.repeat(24), post_id: postId, token: 'forged-token', redeemed_count: 0, created_at: new Date()
            });

            await assert.rejects(
                knex('gift_links_active').insert({
                    id: 'b'.repeat(24), gift_link_id: 'a'.repeat(24), post_id: postId, created_at: new Date()
                }),
                /unique|ER_DUP_ENTRY|constraint/i
            );
        });
    });
});
