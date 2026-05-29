const assert = require('node:assert/strict');
const sinon = require('sinon');
const supertest = require('supertest');
const moment = require('moment');
const testUtils = require('../utils');
const configUtils = require('../utils/config-utils');
const settingsCache = require('../../core/shared/settings-cache');

function assertContentIsPresent(res) {
    assert(res.text.includes('<h2 id="markdown">markdown</h2>'), 'expected full post content to be present');
}

function assertContentIsAbsent(res) {
    assert(!res.text.includes('<h2 id="markdown">markdown</h2>'), 'expected post content to be gated/absent');
}

describe('Front-end gift links', function () {
    let request;
    let token;

    before(async function () {
        const originalSettingsCacheGetFn = settingsCache.get;
        sinon.stub(settingsCache, 'get').callsFake(function (key, options) {
            if (key === 'labs') {
                return {members: true, giftLinks: true};
            }
            if (key === 'active_theme') {
                return 'members-test-theme';
            }
            return originalSettingsCacheGetFn(key, options);
        });

        await testUtils.startGhost({copyThemes: true});

        const paidPost = testUtils.DataGenerator.forKnex.createPost({
            slug: 'gift-me-this-paid-post',
            visibility: 'paid',
            published_at: moment().toDate()
        });
        await testUtils.fixtures.insertPosts([paidPost]);

        // Mint an active gift link for the paid post.
        const giftLinksService = require('../../core/server/services/gift-links');
        const link = await giftLinksService.api.ensure(paidPost.id, {context: {internal: true}});
        token = link.get('token');

        request = supertest.agent(configUtils.config.get('url'));
    });

    after(function () {
        sinon.restore();
    });

    it('paywalls the paid post for an anonymous visitor with no gift token', async function () {
        await request
            .get('/gift-me-this-paid-post/')
            .expect(200)
            .expect(assertContentIsAbsent);
    });

    it('unlocks the full post for an anonymous visitor with a valid gift token', async function () {
        const res = await request
            .get(`/gift-me-this-paid-post/?gift=${token}`)
            .expect(200)
            .expect(assertContentIsPresent);

        // Must never be cached (query strings aren't part of the cache key) and
        // must not be indexed.
        assert.match(res.headers['cache-control'], /no-store/);
        assert.equal(res.headers['x-robots-tag'], 'noindex');
        assert.equal(res.headers['referrer-policy'], 'no-referrer');
    });

    it('falls back to the paywall for an invalid gift token but still bypasses cache', async function () {
        const res = await request
            .get('/gift-me-this-paid-post/?gift=not-a-real-token')
            .expect(200)
            .expect(assertContentIsAbsent);

        assert.match(res.headers['cache-control'], /no-store/);
    });
});
