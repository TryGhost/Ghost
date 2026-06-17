import assert from 'node:assert/strict';

const {agentProvider, fixtureManager, mockManager} = require('../../utils/e2e-framework');
const models = require('../../../core/server/models');

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
        await models.Base.knex('post_gift_links').del();
        await models.Base.knex('gift_links').del();
    });

    it('GET returns an empty list when no link exists', async function () {
        const {body} = await agent.get(`posts/${postId}/gift_link/`).expectStatus(200);
        assert.deepEqual(body, {gift_links: []});
    });

    it('PUT serialises the gift link as a token-shaped resource in a list', async function () {
        const {body} = await agent.put(`posts/${postId}/gift_link/`).expectStatus(200);

        assert.deepEqual(Object.keys(body), ['gift_links']);
        assert.equal(body.gift_links.length, 1);
        // Allow-list — the response exposes only these fields.
        assert.deepEqual(
            Object.keys(body.gift_links[0]).sort(),
            ['created_at', 'last_redeemed_at', 'redeemed_count', 'token']
        );
    });

    it('POST returns a single gift_link resource in the list', async function () {
        const {body} = await agent.post(`posts/${postId}/gift_link/`).expectStatus(200);
        assert.deepEqual(Object.keys(body), ['gift_links']);
        assert.ok(body.gift_links[0].token);
    });

    it('revoke_all returns the count in a meta block, not as a resource', async function () {
        await agent.put(`posts/${postId}/gift_link/`).expectStatus(200);
        const {body} = await agent.put('gift_links/revoke_all/').expectStatus(200);
        assert.deepEqual(body, {meta: {count: 1}});
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

    it('supports the full lifecycle through the API', async function () {
        // empty
        let body = (await agent.get(`posts/${postId}/gift_link/`).expectStatus(200)).body;
        assert.deepEqual(body.gift_links, []);

        // issue
        body = (await agent.put(`posts/${postId}/gift_link/`).expectStatus(200)).body;
        const first = body.gift_links[0].token;
        assert.ok(first);
        assert.equal(body.gift_links[0].redeemed_count, 0);
        body = (await agent.get(`posts/${postId}/gift_link/`).expectStatus(200)).body;
        assert.equal(body.gift_links[0].token, first);

        // reissue
        body = (await agent.post(`posts/${postId}/gift_link/`).expectStatus(200)).body;
        const second = body.gift_links[0].token;
        assert.notEqual(second, first);
        body = (await agent.get(`posts/${postId}/gift_link/`).expectStatus(200)).body;
        assert.equal(body.gift_links[0].token, second);

        // revoke
        body = (await agent.put('gift_links/revoke_all/').expectStatus(200)).body;
        assert.deepEqual(body, {meta: {count: 1}});
        body = (await agent.get(`posts/${postId}/gift_link/`).expectStatus(200)).body;
        assert.deepEqual(body.gift_links, []);

        // issue again
        body = (await agent.put(`posts/${postId}/gift_link/`).expectStatus(200)).body;
        const third = body.gift_links[0].token;
        assert.ok(third && third !== first && third !== second);
        assert.equal(body.gift_links[0].redeemed_count, 0);
    });
});
