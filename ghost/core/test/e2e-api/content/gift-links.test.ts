import assert from 'node:assert/strict';

const {agentProvider, fixtureManager, mockManager} = require('../../utils/e2e-framework');
const models = require('../../../core/server/models');

describe('Gift Links Content API', function () {
    let agent: {
        get: (_url: string) => any;
        authenticate: () => Promise<void>;
    };
    let postId: string;

    const mintToken = async (): Promise<string> => {
        const giftLinksService = require('../../../core/server/services/gift-links');
        const {giftLinks: [{token}]} = await giftLinksService.service.ensure({actor: null}, postId);
        return token;
    };

    beforeAll(async function () {
        agent = await agentProvider.getContentAPIAgent();
        await fixtureManager.init('api_keys', 'posts');
        await agent.authenticate();
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

    it('resolves a live token to the post it unlocks', async function () {
        const token = await mintToken();

        const {body} = await agent.get(`/gift_links/${token}/`).expectStatus(200);
        assert.deepEqual(body, {gift_links: [{post_id: postId}]});
    });

    it('404s for an unknown token', async function () {
        await agent.get('/gift_links/not-a-real-token/').expectStatus(404);
    });

    it('404s when the giftLinks flag is disabled', async function () {
        const token = await mintToken();
        mockManager.mockLabsDisabled('giftLinks');

        await agent.get(`/gift_links/${token}/`).expectStatus(404);
    });
});
