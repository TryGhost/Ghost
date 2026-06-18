import assert from 'node:assert/strict';

const {agentProvider, fixtureManager, mockManager} = require('../../utils/e2e-framework');
const models = require('../../../core/server/models');

// HTTP contract only (paths, the giftLinks flag, permissions, response shape); service
// behaviour is covered by the integration tests.
describe('Gift Links Admin API', function () {
    let agent: {
        get: (_url: string) => any;
        put: (_url: string) => any;
        post: (_url: string) => any;
        loginAsOwner: () => Promise<void>;
        loginAsContributor: () => Promise<void>;
    };
    let postId: string;

    before(async function () {
        agent = await agentProvider.getAdminAPIAgent();
        await fixtureManager.init('users', 'posts');
        await agent.loginAsOwner();
        postId = fixtureManager.get('posts', 0).id;
    });

    beforeEach(function () {
        mockManager.mockLabsEnabled('giftLinks');
    });

    afterEach(async function () {
        mockManager.restore();
        await models.Base.knex('gift_links_active').del();
        await models.Base.knex('gift_links').del();
    });

    it('GET returns an empty list when no live link exists', async function () {
        const {body} = await agent.get(`posts/${postId}/gift_link/`).expectStatus(200);
        assert.deepEqual(body, {gift_links: []});
    });

    it('PUT serialises the live link as a token-shaped resource', async function () {
        const {body} = await agent.put(`posts/${postId}/gift_link/`).expectStatus(200);

        assert.deepEqual(Object.keys(body), ['gift_links']);
        assert.equal(body.gift_links.length, 1);
        // allow-list: no post_id, surrogate id, status or updated_at
        assert.deepEqual(
            Object.keys(body.gift_links[0]).sort(),
            ['created_at', 'last_redeemed_at', 'redeemed_count', 'token']
        );
    });

    it('POST reissues and returns the live link', async function () {
        const {body} = await agent.post(`posts/${postId}/gift_link/`).expectStatus(200);
        assert.equal(body.gift_links.length, 1);
        assert.ok(body.gift_links[0].token);
    });

    it('revoke_all returns the count, not a resource list', async function () {
        await agent.put(`posts/${postId}/gift_link/`).expectStatus(200);
        const {body} = await agent.put('gift_links/revoke_all/').expectStatus(200);
        assert.deepEqual(body, {gift_links: {revoked: 1}});
    });

    it('403s for a role without gift-link permission', async function () {
        await agent.loginAsContributor();
        await agent.get(`posts/${postId}/gift_link/`).expectStatus(403);
        await agent.loginAsOwner();
    });

    it('404s when the giftLinks flag is disabled', async function () {
        mockManager.mockLabsDisabled('giftLinks');
        await agent.get(`posts/${postId}/gift_link/`).expectStatus(404);
    });

    it('supports the full lifecycle end to end', async function () {
        // Redeeming a token has no admin endpoint (it is the reader path), so those steps
        // go through the service; every other step is driven through the API.
        const {service} = require('../../../core/server/services/gift-links');

        // empty: the post has no live link yet
        let body = (await agent.get(`posts/${postId}/gift_link/`).expectStatus(200)).body;
        assert.deepEqual(body.gift_links, []);

        // issue: a link is minted with a zeroed counter
        body = (await agent.put(`posts/${postId}/gift_link/`).expectStatus(200)).body;
        const first = body.gift_links[0].token;
        assert.ok(first);
        assert.equal(body.gift_links[0].redeemed_count, 0);

        // redeem: a read is counted against the live token
        await service.recordRedemption(first);
        body = (await agent.get(`posts/${postId}/gift_link/`).expectStatus(200)).body;
        assert.equal(body.gift_links[0].token, first);
        assert.equal(body.gift_links[0].redeemed_count, 1);

        // reissue: a fresh token, a reset counter, and the old token stops resolving
        body = (await agent.post(`posts/${postId}/gift_link/`).expectStatus(200)).body;
        const second = body.gift_links[0].token;
        assert.notEqual(second, first);
        assert.equal(body.gift_links[0].redeemed_count, 0);
        assert.equal(await service.getPostByToken(first), null);

        // revoke: the site-wide kill switch clears the live link
        body = (await agent.put('gift_links/revoke_all/').expectStatus(200)).body;
        assert.deepEqual(body, {gift_links: {revoked: 1}});
        body = (await agent.get(`posts/${postId}/gift_link/`).expectStatus(200)).body;
        assert.deepEqual(body.gift_links, []);

        // issue again: a brand new link on its own counter
        body = (await agent.put(`posts/${postId}/gift_link/`).expectStatus(200)).body;
        const third = body.gift_links[0].token;
        assert.ok(third && third !== first && third !== second);
        assert.equal(body.gift_links[0].redeemed_count, 0);
    });
});
