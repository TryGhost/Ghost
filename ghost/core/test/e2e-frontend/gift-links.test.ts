import assert from 'node:assert/strict';
import sinon from 'sinon';
import supertest from 'supertest';
import moment from 'moment';
// This suite runs under vitest; beforeAll/afterAll aren't in the mocha globals
// that tsc resolves project-wide, so import them explicitly for type-checking.
import {afterAll, beforeAll} from 'vitest';

const testUtils = require('../utils');
const configUtils = require('../utils/config-utils');
const settingsCache = require('../../core/shared/settings-cache');
const models = require('../../core/server/models');

const HUMAN_UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15';

// The redesign tracks the counter directly on the gift_links row (no Bookshelf
// model), so read it straight off the table via knex.
async function pollRedeemedCount(token: string, atLeast: number, tries = 30): Promise<number> {
    const knex = models.Base.knex;
    for (let i = 0; i < tries; i += 1) {
        const link = await knex('gift_links').where({token}).first();
        if (link && link.redeemed_count >= atLeast) {
            return link.redeemed_count;
        }
        await new Promise<void>((resolve) => {
            setTimeout(resolve, 50);
        });
    }
    const link = await knex('gift_links').where({token}).first();
    return link ? link.redeemed_count : -1;
}

function assertContentIsPresent(res: any) {
    assert(res.text.includes('<h2 id="markdown">markdown</h2>'), 'expected full post content to be present');
}

function assertContentIsAbsent(res: any) {
    assert(!res.text.includes('<h2 id="markdown">markdown</h2>'), 'expected post content to be gated/absent');
}

describe('Front-end gift links', function () {
    let request: any;
    let token: string;
    let postId: string;
    const slug = 'gift-me-this-paid-post';

    beforeAll(async function () {
        const originalSettingsCacheGetFn = settingsCache.get;
        sinon.stub(settingsCache, 'get').callsFake(function (key: any, options: any) {
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
            slug,
            visibility: 'paid',
            published_at: moment().toDate()
        });
        await testUtils.fixtures.insertPosts([paidPost]);
        postId = paidPost.id;

        // Mint a live gift link for the paid post.
        const giftLinksService = require('../../core/server/services/gift-links');
        const post = await giftLinksService.service.issue(paidPost.id);
        token = post.giftLinks[0].token;

        request = supertest.agent(configUtils.config.get('url'));
    });

    afterAll(function () {
        sinon.restore();
    });

    it('paywalls the paid post for an anonymous visitor on the canonical URL', async function () {
        const res = await request
            .get(`/${slug}/`)
            .expect(200)
            .expect(assertContentIsAbsent);
        // No gift → no `@gift` template context on the canonical URL
        assert.ok(!res.text.includes('gift-context:'));
    });

    it('unlocks the full post for an anonymous visitor with a valid /g/ + key', async function () {
        const res = await request
            .get(`/g/${slug}/?key=${token}`)
            .expect(200)
            .expect(assertContentIsPresent);

        // Must never be cached (path-based bypass + origin no-store) and
        // must not be indexed.
        assert.match(res.headers['cache-control'], /no-store/);
        assert.equal(res.headers['x-robots-tag'], 'noindex');
        assert.equal(res.headers['referrer-policy'], 'no-referrer');

        // Core ships no default reader-facing gift UI — themes opt in via the
        // documented `@gift` template context instead (the test theme renders
        // a marker from it).
        assert.ok(res.text.includes(`gift-context:${postId}`), 'exposes @gift to the theme');
        assert.ok(!res.text.includes('gh-gift-callout'), 'no default gift callout');
    });

    it('301s to the canonical URL when the gift token is invalid', async function () {
        const res = await request
            .get(`/g/${slug}/?key=not-a-real-token`)
            .redirects(0)
            .expect(301);

        // Redirect target carries no key and no utm — invalid attempts must
        // not pollute gift counts or campaign analytics.
        assert.match(res.headers.location, new RegExp(`/${slug}/?$`));
        assert.doesNotMatch(res.headers.location, /key=/);
        assert.doesNotMatch(res.headers.location, /utm_campaign=/);
        // The 301 itself must NOT be cached, so a reset link can't poison
        // subsequent requests via a stale browser-cached redirect.
        assert.match(res.headers['cache-control'], /no-store/);
    });

    it('301s to the canonical URL when no key is provided', async function () {
        const res = await request
            .get(`/g/${slug}/`)
            .redirects(0)
            .expect(301);

        assert.match(res.headers.location, new RegExp(`/${slug}/?$`));
        assert.match(res.headers['cache-control'], /no-store/);
    });

    it('301s to the canonical URL when a valid token is paired with the wrong slug', async function () {
        // Use a different valid slug. The token unlocks the original post,
        // but the URL slug doesn't match → treat as invalid (never leak the
        // real slug by redirecting to the token's actual post).
        const otherPost = testUtils.DataGenerator.forKnex.createPost({
            slug: 'unrelated-paid-post',
            visibility: 'paid',
            published_at: moment().toDate()
        });
        await testUtils.fixtures.insertPosts([otherPost]);

        const res = await request
            .get(`/g/unrelated-paid-post/?key=${token}`)
            .redirects(0)
            .expect(301);

        assert.match(res.headers.location, /\/unrelated-paid-post\/?$/);
        assert.doesNotMatch(res.headers.location, /key=/);
    });

    it('404s when the URL slug does not resolve to any published post', async function () {
        // Deliberately a VALID key: even though the token resolves, the slug
        // mismatch + unresolvable fallback must render a clean 404 with no
        // `@gift` context leaking into the error template.
        const res = await request
            .get(`/g/no-such-slug/?key=${token}`)
            .redirects(0)
            .expect(404);

        assert.ok(!res.text.includes('gift-context:'), 'no @gift context on error renders');
    });

    it('counts a human gift read once and de-dupes repeat views via the ghost-gift-seen cookie', async function () {
        // Fresh client (no prior cookie) with a real browser UA so it isn't bot-filtered.
        const humanAgent = supertest.agent(configUtils.config.get('url'));

        const res = await humanAgent
            .get(`/g/${slug}/?key=${token}`)
            .set('User-Agent', HUMAN_UA)
            .expect(200);

        const setCookie = ((res.headers['set-cookie'] as unknown as string[]) || []).join(';');
        assert.match(setCookie, /ghost-gift-seen-/, 'sets the per-post de-dup cookie');

        // Count is incremented out-of-band (non-blocking), so poll briefly.
        assert.equal(await pollRedeemedCount(token, 1), 1);

        // A second view from the same client must NOT double-count (cookie matches token).
        await humanAgent
            .get(`/g/${slug}/?key=${token}`)
            .set('User-Agent', HUMAN_UA)
            .expect(200);
        assert.equal(await pollRedeemedCount(token, 1), 1, 'repeat view from same client is de-duped');
    });
});
