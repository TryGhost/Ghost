import assert from 'node:assert/strict';
import moment from 'moment';
// beforeAll isn't in the mocha globals that tsc resolves project-wide; this
// suite runs under vitest, so import it explicitly for type-checking.
import {beforeAll} from 'vitest';

const testUtils = require('../../utils');
const {agentProvider, fixtureManager} = require('../../utils/e2e-framework');

// Handling ?gift is intentionally a site-frontend concern only: the token
// travels as internal read context from the entry lookup, and the public
// Content API ignores a ?gift param. These tests pin that choice.
describe('Gift links Content API', function () {
    let agent: any;
    let token: string;
    const slug = 'gift-me-this-paid-post';

    beforeAll(async function () {
        agent = await agentProvider.getContentAPIAgent();
        await fixtureManager.init('api_keys');
        await agent.authenticate();

        const paidPost = testUtils.DataGenerator.forKnex.createPost({
            slug,
            visibility: 'paid',
            status: 'published',
            published_at: moment().toDate(),
            lexical: testUtils.DataGenerator.markdownToLexical('Before paywall\n\n<!--members-only-->\n\nAfter paywall')
        });
        await testUtils.fixtures.insertPosts([paidPost]);

        // require, not import: an ESM import resolves to a separate module
        // instance from the one the booted Ghost initialized the singleton on.
        const giftLinksService = require('../../../core/server/services/gift-links');
        token = (await giftLinksService.service.ensure({actor: null}, paidPost.id)).giftLinks[0].token;
    });

    it('ignores a valid ?gift token: the post stays gated and cacheable', async function () {
        const res = await agent
            .get(`posts/slug/${slug}/?gift=${token}`)
            .expectStatus(200);

        assert.doesNotMatch(res.body.posts[0].html, /After paywall/);
        assert.match(res.headers['cache-control'], /public/);
    });

    it('ignores an unknown ?gift token: no gift-specific error', async function () {
        const res = await agent
            .get(`posts/slug/${slug}/?gift=not-a-real-token`)
            .expectStatus(200);

        assert.doesNotMatch(res.body.posts[0].html, /After paywall/);
    });
});
