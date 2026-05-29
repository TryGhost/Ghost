const assert = require('node:assert/strict');
const sinon = require('sinon');
const supertest = require('supertest');
const moment = require('moment');
const testUtils = require('../utils');
const configUtils = require('../utils/config-utils');
const settingsCache = require('../../core/shared/settings-cache');
const models = require('../../core/server/models');

const HUMAN_UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15';

async function pollRedeemedCount(token, atLeast, tries = 30) {
    for (let i = 0; i < tries; i += 1) {
        const link = await models.GiftLink.findOne({token}, {require: false});
        if (link && link.get('redeemed_count') >= atLeast) {
            return link.get('redeemed_count');
        }
        await new Promise((resolve) => {
            setTimeout(resolve, 50);
        });
    }
    const link = await models.GiftLink.findOne({token}, {require: false});
    return link ? link.get('redeemed_count') : -1;
}

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

    it('counts a human gift read once and de-dupes repeat views via the gift_seen cookie', async function () {
        // Fresh client (no prior cookie) with a real browser UA so it isn't bot-filtered.
        const humanAgent = supertest.agent(configUtils.config.get('url'));

        const res = await humanAgent
            .get(`/gift-me-this-paid-post/?gift=${token}`)
            .set('User-Agent', HUMAN_UA)
            .expect(200);

        const setCookie = (res.headers['set-cookie'] || []).join(';');
        assert.match(setCookie, /gift_seen_/, 'sets the per-post de-dup cookie');

        // Count is incremented out-of-band (non-blocking), so poll briefly.
        assert.equal(await pollRedeemedCount(token, 1), 1);

        // A second view from the same client must NOT double-count (cookie matches token).
        await humanAgent
            .get(`/gift-me-this-paid-post/?gift=${token}`)
            .set('User-Agent', HUMAN_UA)
            .expect(200);
        assert.equal(await pollRedeemedCount(token, 1), 1, 'repeat view from same client is de-duped');
    });
});
