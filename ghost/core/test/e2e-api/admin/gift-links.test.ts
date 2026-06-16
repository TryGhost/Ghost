import assert from 'node:assert/strict';

const {
    agentProvider,
    fixtureManager,
    mockManager,
    resetRateLimits
} = require('../../utils/e2e-framework');
const models = require('../../../core/server/models');

describe('Gift Links Admin API', function () {
    let agent: any;
    let gatedPostId: string;
    let gatedPageId: string;
    let publicPostId: string;
    let draftPostId: string;
    let authorOwnedPostId: string;
    const missingPostId = '0123456789abcdef01234567';

    // `loginAsAuthor()` authenticates DataGenerator.Content.users[3] (role Author).
    const authorUserId = '6193c685e792de832cd08141';

    before(async function () {
        agent = await agentProvider.getAdminAPIAgent();
        await fixtureManager.init('users', 'posts');
        await agent.loginAsOwner();

        // posts[8]/[9] are published posts; posts[5] is a page; posts[3] is a draft.
        gatedPostId = fixtureManager.get('posts', 8).id;
        publicPostId = fixtureManager.get('posts', 9).id;
        draftPostId = fixtureManager.get('posts', 3).id;
        gatedPageId = fixtureManager.get('posts', 5).id;

        // Make the gated post members-only (published + non-public => eligible).
        await models.Post.edit({visibility: 'members'}, {id: gatedPostId, context: {internal: true}});
        // Keep the "public" post explicitly public.
        await models.Post.edit({visibility: 'public'}, {id: publicPostId, context: {internal: true}});
        // Gift links are type-agnostic: a published, gated PAGE is also eligible.
        await models.Post.edit({status: 'published', visibility: 'members'}, {id: gatedPageId, context: {internal: true}});

        // A published, members-only post AUTHORED BY the Author fixture user, so
        // an Author can manage its gift links (can edit own post => can gift it).
        const authorOwnedPost = await models.Post.add({
            title: 'Author-owned gift-eligible post',
            status: 'published',
            visibility: 'members',
            authors: [{id: authorUserId}]
        }, {context: {internal: true}});
        authorOwnedPostId = authorOwnedPost.id;
    });

    after(async function () {
        if (authorOwnedPostId) {
            await models.Post.destroy({id: authorOwnedPostId, context: {internal: true}});
        }
    });

    afterEach(async function () {
        mockManager.restore();
        await models.Base.knex('gift_links').del();
    });

    describe('with the giftLinks flag disabled', function () {
        beforeEach(function () {
            mockManager.mockLabsDisabled('giftLinks');
        });

        it('404s the per-post endpoints', async function () {
            await agent.get(`gift_links/${gatedPostId}/`).expectStatus(404);
            await agent.post(`gift_links/${gatedPostId}/`).expectStatus(404);
            await agent.put(`gift_links/${gatedPostId}/reset/`).expectStatus(404);
        });

        it('404s reset_all', async function () {
            await agent.put('gift_links/reset_all/').expectStatus(404);
        });
    });

    describe('with the giftLinks flag enabled', function () {
        beforeEach(function () {
            mockManager.mockLabsEnabled('giftLinks');
        });

        describe('read', function () {
            it('returns an empty list when nothing has been shared', async function () {
                const {body} = await agent.get(`gift_links/${gatedPostId}/`).expectStatus(200);
                assert.deepEqual(body.gift_links, []);
            });

            it('returns the active link once ensured', async function () {
                await agent.post(`gift_links/${gatedPostId}/`).expectStatus(200);
                const {body} = await agent.get(`gift_links/${gatedPostId}/`).expectStatus(200);
                assert.equal(body.gift_links.length, 1);
                assert.equal(body.gift_links[0].post_id, gatedPostId);
                assert.equal(body.gift_links[0].status, 'active');
            });

            it('404s a post that does not exist', async function () {
                await agent.get(`gift_links/${missingPostId}/`).expectStatus(404);
            });
        });

        describe('ensure', function () {
            it('creates an active link with a token and zeroed count', async function () {
                const {body} = await agent.post(`gift_links/${gatedPostId}/`).expectStatus(200);
                assert.equal(body.gift_links.length, 1);
                const link = body.gift_links[0];
                assert.equal(link.post_id, gatedPostId);
                assert.equal(link.status, 'active');
                assert.equal(link.redeemed_count, 0);
                assert.ok(link.token, 'token present');
                // The shareable URL is composed client-side from post.url, not returned here.
                assert.equal(link.url, undefined);
            });

            it('is idempotent — same token on repeat', async function () {
                const first = (await agent.post(`gift_links/${gatedPostId}/`).expectStatus(200)).body.gift_links[0];
                const second = (await agent.post(`gift_links/${gatedPostId}/`).expectStatus(200)).body.gift_links[0];
                assert.equal(first.token, second.token);
            });

            it('works for a gated published page (type-agnostic)', async function () {
                const {body} = await agent.post(`gift_links/${gatedPageId}/`).expectStatus(200);
                assert.equal(body.gift_links.length, 1);
                assert.equal(body.gift_links[0].post_id, gatedPageId);
                assert.equal(body.gift_links[0].status, 'active');
            });

            it('rejects a public post as ineligible (422)', async function () {
                await agent.post(`gift_links/${publicPostId}/`).expectStatus(422);
            });

            it('rejects a draft post as ineligible (422)', async function () {
                await agent.post(`gift_links/${draftPostId}/`).expectStatus(422);
            });

            it('404s a post that does not exist', async function () {
                await agent.post(`gift_links/${missingPostId}/`).expectStatus(404);
            });
        });

        describe('reset', function () {
            it('mints a new token and invalidates the old one', async function () {
                const original = (await agent.post(`gift_links/${gatedPostId}/`).expectStatus(200)).body.gift_links[0];
                const renewed = (await agent.put(`gift_links/${gatedPostId}/reset/`).expectStatus(200)).body.gift_links[0];

                assert.notEqual(renewed.token, original.token);
                assert.equal(renewed.status, 'active');

                // The active link is now the renewed one
                const {body} = await agent.get(`gift_links/${gatedPostId}/`).expectStatus(200);
                assert.equal(body.gift_links[0].token, renewed.token);
            });

            it('resets a link on a post that later became ineligible (rotate a leaked link)', async function () {
                // Mint a link while the post is eligible (members-only).
                const original = (await agent.post(`gift_links/${gatedPostId}/`).expectStatus(200)).body.gift_links[0];

                // The post later flips to public => ensure would now 422.
                await models.Post.edit({visibility: 'public'}, {id: gatedPostId, context: {internal: true}});
                await agent.post(`gift_links/${gatedPostId}/`).expectStatus(422);

                // ...but reset must still succeed so a leaked link can be rotated.
                const renewed = (await agent.put(`gift_links/${gatedPostId}/reset/`).expectStatus(200)).body.gift_links[0];
                assert.notEqual(renewed.token, original.token);
                assert.equal(renewed.status, 'active');

                // Restore eligibility for any subsequent tests sharing this fixture.
                await models.Post.edit({visibility: 'members'}, {id: gatedPostId, context: {internal: true}});
            });
        });

        describe('reset_all', function () {
            it('deactivates every active link site-wide', async function () {
                await agent.post(`gift_links/${gatedPostId}/`).expectStatus(200);

                const {body} = await agent.put('gift_links/reset_all/').expectStatus(200);
                assert.equal(body.gift_links.reset, 1);

                const after = await agent.get(`gift_links/${gatedPostId}/`).expectStatus(200);
                assert.deepEqual(after.body.gift_links, []);
            });
        });

        describe('permissions', function () {
            // Each test re-authenticates as a non-owner role; reset the login
            // rate limiter so the repeated logins don't trip brute-force
            // protection ("Too many attempts").
            beforeEach(async function () {
                await resetRateLimits();
            });

            it('allows an Editor to manage per-post links', async function () {
                await agent.loginAsEditor();
                await agent.post(`gift_links/${gatedPostId}/`).expectStatus(200);
                await agent.get(`gift_links/${gatedPostId}/`).expectStatus(200);
                await agent.put(`gift_links/${gatedPostId}/reset/`).expectStatus(200);
            });

            it('forbids an Editor from reset_all (403)', async function () {
                await agent.loginAsEditor();
                await agent.put('gift_links/reset_all/').expectStatus(403);
            });

            it('allows an Author to manage links for their OWN post', async function () {
                // Gift-link management piggybacks on post-edit: an Author can edit
                // (and therefore gift) a post they author.
                await agent.loginAsAuthor();
                await agent.post(`gift_links/${authorOwnedPostId}/`).expectStatus(200);
                await agent.get(`gift_links/${authorOwnedPostId}/`).expectStatus(200);
                await agent.put(`gift_links/${authorOwnedPostId}/reset/`).expectStatus(200);
            });

            it('forbids an Author from managing links for a post they do NOT author (403)', async function () {
                // gatedPostId is authored by the Owner, not this Author.
                await agent.loginAsAuthor();
                await agent.get(`gift_links/${gatedPostId}/`).expectStatus(403);
                await agent.post(`gift_links/${gatedPostId}/`).expectStatus(403);
                await agent.put(`gift_links/${gatedPostId}/reset/`).expectStatus(403);
            });

            it('forbids an Author from reset_all (403)', async function () {
                await agent.loginAsAuthor();
                await agent.put('gift_links/reset_all/').expectStatus(403);
            });
        });
    });
});
