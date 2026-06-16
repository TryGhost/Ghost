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

        // Representative fixtures across visibility/status; eligibility isn't
        // enforced at mint time, so visibility doesn't gate minting.
        await models.Post.edit({visibility: 'members'}, {id: gatedPostId, context: {internal: true}});
        await models.Post.edit({visibility: 'public'}, {id: publicPostId, context: {internal: true}});
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
            await agent.get(`posts/${gatedPostId}/gift_link/`).expectStatus(404);
            await agent.put(`posts/${gatedPostId}/gift_link/`).expectStatus(404);
            await agent.post(`posts/${gatedPostId}/gift_link/reset/`).expectStatus(404);
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
                const {body} = await agent.get(`posts/${gatedPostId}/gift_link/`).expectStatus(200);
                assert.deepEqual(body.gift_links, []);
            });

            it('returns the active link once created', async function () {
                await agent.put(`posts/${gatedPostId}/gift_link/`).expectStatus(200);
                const {body} = await agent.get(`posts/${gatedPostId}/gift_link/`).expectStatus(200);
                assert.equal(body.gift_links.length, 1);
                assert.equal(body.gift_links[0].post_id, gatedPostId);
                assert.equal(body.gift_links[0].status, 'active');
            });

            it('404s a post that does not exist', async function () {
                // Authorisation piggybacks on post-edit, and the object-permission
                // check 404s a missing post before the query runs.
                await agent.get(`posts/${missingPostId}/gift_link/`).expectStatus(404);
            });
        });

        describe('upsert', function () {
            it('creates an active link with a token and zeroed count', async function () {
                const {body} = await agent.put(`posts/${gatedPostId}/gift_link/`).expectStatus(200);
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
                const first = (await agent.put(`posts/${gatedPostId}/gift_link/`).expectStatus(200)).body.gift_links[0];
                const second = (await agent.put(`posts/${gatedPostId}/gift_link/`).expectStatus(200)).body.gift_links[0];
                assert.equal(first.token, second.token);
            });

            it('works for a gated published page (type-agnostic, via /pages route)', async function () {
                const {body} = await agent.put(`pages/${gatedPageId}/gift_link/`).expectStatus(200);
                assert.equal(body.gift_links.length, 1);
                assert.equal(body.gift_links[0].post_id, gatedPageId);
                assert.equal(body.gift_links[0].status, 'active');
            });

            it('mints regardless of post visibility/status (no eligibility gate)', async function () {
                for (const id of [publicPostId, draftPostId]) {
                    const {body} = await agent.put(`posts/${id}/gift_link/`).expectStatus(200);
                    assert.equal(body.gift_links[0].status, 'active');
                }
            });

            it('404s a post that does not exist', async function () {
                await agent.put(`posts/${missingPostId}/gift_link/`).expectStatus(404);
            });
        });

        describe('reset', function () {
            it('mints a new token and invalidates the old one', async function () {
                const original = (await agent.put(`posts/${gatedPostId}/gift_link/`).expectStatus(200)).body.gift_links[0];
                const renewed = (await agent.post(`posts/${gatedPostId}/gift_link/reset/`).expectStatus(200)).body.gift_links[0];

                assert.notEqual(renewed.token, original.token);
                assert.equal(renewed.status, 'active');

                // The active link is now the renewed one
                const {body} = await agent.get(`posts/${gatedPostId}/gift_link/`).expectStatus(200);
                assert.equal(body.gift_links[0].token, renewed.token);
            });

            it('mints a fresh link when none existed (reset implies create)', async function () {
                const renewed = (await agent.post(`posts/${gatedPostId}/gift_link/reset/`).expectStatus(200)).body.gift_links[0];
                assert.equal(renewed.status, 'active');
            });
        });

        describe('reset_all', function () {
            it('deactivates every active link site-wide', async function () {
                await agent.put(`posts/${gatedPostId}/gift_link/`).expectStatus(200);

                const {body} = await agent.put('gift_links/reset_all/').expectStatus(200);
                assert.equal(body.gift_links.reset, 1);

                const after = await agent.get(`posts/${gatedPostId}/gift_link/`).expectStatus(200);
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
                await agent.put(`posts/${gatedPostId}/gift_link/`).expectStatus(200);
                await agent.get(`posts/${gatedPostId}/gift_link/`).expectStatus(200);
                await agent.post(`posts/${gatedPostId}/gift_link/reset/`).expectStatus(200);
            });

            it('forbids an Editor from reset_all (403)', async function () {
                await agent.loginAsEditor();
                await agent.put('gift_links/reset_all/').expectStatus(403);
            });

            it('allows an Author to manage links for their OWN post', async function () {
                // Gift-link management piggybacks on post-edit: an Author can edit
                // (and therefore gift) a post they author.
                await agent.loginAsAuthor();
                await agent.put(`posts/${authorOwnedPostId}/gift_link/`).expectStatus(200);
                await agent.get(`posts/${authorOwnedPostId}/gift_link/`).expectStatus(200);
                await agent.post(`posts/${authorOwnedPostId}/gift_link/reset/`).expectStatus(200);
            });

            it('forbids an Author from managing links for a post they do NOT author (403)', async function () {
                // gatedPostId is authored by the Owner, not this Author.
                await agent.loginAsAuthor();
                await agent.get(`posts/${gatedPostId}/gift_link/`).expectStatus(403);
                await agent.put(`posts/${gatedPostId}/gift_link/`).expectStatus(403);
                await agent.post(`posts/${gatedPostId}/gift_link/reset/`).expectStatus(403);
            });

            it('forbids an Author from reset_all (403)', async function () {
                await agent.loginAsAuthor();
                await agent.put('gift_links/reset_all/').expectStatus(403);
            });
        });
    });
});
