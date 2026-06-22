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

// Default member-test-theme renders `{{content}}`; a paid post with a
// `<!--members-only-->` marker truncates at the paywall when the reader has no
// access, so "After paywall" is the access tell.
function assertUnlocked(res: any) {
    assert.match(res.text, /Before paywall/, 'lead content should render');
    assert.match(res.text, /After paywall/, 'gated content should render for a valid gift read');
}

function assertLocked(res: any) {
    assert.match(res.text, /Before paywall/, 'lead content should render');
    assert.doesNotMatch(res.text, /After paywall/, 'gated content must not render without access');
}

describe('Front-end gift links', function () {
    let request: any;
    let token: string;
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
            status: 'published',
            published_at: moment().toDate(),
            mobiledoc: testUtils.DataGenerator.markdownToMobiledoc('Before paywall\n\n<!--members-only-->\n\nAfter paywall')
        });
        await testUtils.fixtures.insertPosts([paidPost]);

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
        await request
            .get(`/${slug}/`)
            .expect(200)
            .expect(assertLocked);
    });

    it('unlocks the full post for an anonymous visitor with a valid /g/ + key', async function () {
        const res = await request
            .get(`/g/${slug}/?key=${token}`)
            .expect(200)
            .expect(assertUnlocked);

        // Never cached (no member cookie, path-based bypass) and never indexed.
        assert.match(res.headers['cache-control'], /no-store/);
        assert.equal(res.headers['x-robots-tag'], 'noindex');
        assert.equal(res.headers['referrer-policy'], 'no-referrer');
    });

    it('canonicalises a stale slug to the current slug, keeping the key', async function () {
        // Token is authoritative; the slug is cosmetic. A wrong-but-resolving
        // token must redirect to the token's own current slug, preserving the
        // key so the post still opens.
        const res = await request
            .get(`/g/some-old-slug/?key=${token}`)
            .redirects(0)
            .expect(301);

        assert.equal(res.headers.location, `/g/${slug}/?key=${token}`);
        assert.match(res.headers['cache-control'], /no-store/);
    });

    it('301s to the canonical URL when the gift token is invalid, dropping the key', async function () {
        const res = await request
            .get(`/g/${slug}/?key=not-a-real-token`)
            .redirects(0)
            .expect(301);

        assert.match(res.headers.location, new RegExp(`/${slug}/?$`));
        assert.doesNotMatch(res.headers.location, /key=/);
        // The 301 itself must not be cached, so a reset link can't poison
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

    it('404s when the URL slug does not resolve and the token is invalid', async function () {
        const res = await request
            .get(`/g/no-such-slug/?key=not-a-real-token`)
            .redirects(0)
            .expect(404);

        assert.doesNotMatch(res.text, /After paywall/, 'no gated content leaks on the 404 path');
    });
});
