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
    let pageToken: string;
    const slug = 'gift-me-this-paid-post';
    const otherSlug = 'another-paid-post';
    const pageSlug = 'gift-me-this-paid-page';

    beforeAll(async function () {
        const originalSettingsCacheGetFn = settingsCache.get;
        sinon.stub(settingsCache, 'get').callsFake(function (key: any, options: any) {
            if (key === 'labs') {
                return {members: true, giftLinks: true};
            }
            if (key === 'active_theme') {
                return 'members-test-theme';
            }
            if (key === 'web_analytics') {
                return true;
            }
            return originalSettingsCacheGetFn(key, options);
        });

        // Enable the web-analytics tracker so the suite can assert the gift_link
        // dimension it emits. isWebAnalyticsEnabled() needs the setting above plus
        // a valid tinybird config (a tracker endpoint + a local/JWT credential).
        configUtils.set('tinybird', {
            tracker: {
                endpoint: 'https://e.ghost.org/tb/web_analytics',
                token: 'tinybird_token'
            },
            stats: {
                local: {enabled: true}
            }
        });

        await testUtils.startGhost({copyThemes: true});

        const mobiledoc = testUtils.DataGenerator.markdownToMobiledoc('Before paywall\n\n<!--members-only-->\n\nAfter paywall');
        const paidPost = testUtils.DataGenerator.forKnex.createPost({
            slug,
            visibility: 'paid',
            status: 'published',
            published_at: moment().toDate(),
            mobiledoc
        });
        const otherPaidPost = testUtils.DataGenerator.forKnex.createPost({
            slug: otherSlug,
            visibility: 'paid',
            status: 'published',
            published_at: moment().toDate(),
            mobiledoc
        });
        // A gift link works on a page's canonical URL too, not just a post's.
        const paidPage = testUtils.DataGenerator.forKnex.createPost({
            slug: pageSlug,
            type: 'page',
            visibility: 'paid',
            status: 'published',
            published_at: moment().toDate(),
            mobiledoc
        });
        await testUtils.fixtures.insertPosts([paidPost, otherPaidPost, paidPage]);

        // Mint a live gift link for the paid post and the paid page.
        const giftLinksService = require('../../core/server/services/gift-links');
        token = (await giftLinksService.service.ensure({actor: null}, paidPost.id)).giftLinks[0].token;
        pageToken = (await giftLinksService.service.ensure({actor: null}, paidPage.id)).giftLinks[0].token;

        request = supertest.agent(configUtils.config.get('url'));
    });

    afterAll(async function () {
        sinon.restore();
        await configUtils.restore();
    });

    it('paywalls the paid post for an anonymous visitor on the canonical URL', async function () {
        const res = await request
            .get(`/${slug}/`)
            .expect(200)
            .expect(assertLocked);

        // No gift → no toast on the canonical URL.
        assert.doesNotMatch(res.text, /gh-gift-toast/, 'gift toast must not appear on the canonical URL');
        // The bare URL has no ?gift, so it isn't no-store bypassed — it stays cacheable.
        assert.doesNotMatch(res.headers['cache-control'] || '', /no-store/, 'the bare URL is cacheable');
    });

    it('unlocks the full post for an anonymous visitor with a valid ?gift token', async function () {
        const res = await request
            .get(`/${slug}/?gift=${token}`)
            .expect(200)
            .expect(assertUnlocked);

        // Never cached (no member cookie, unlocked content) and never indexed.
        assert.match(res.headers['cache-control'], /no-store/);
        assert.equal(res.headers['x-robots-tag'], 'noindex');
        assert.equal(res.headers['referrer-policy'], 'no-referrer');

        // The default gift toast renders on the verified gift view.
        assert.match(res.text, /id="gh-gift-toast"/, 'default gift toast renders on a gift view');
        assert.match(res.text, /gifted access to this post/, 'toast announces the gift');
    });

    it('301s to the canonical URL, dropping ?gift, when the token is invalid', async function () {
        const res = await request
            .get(`/${slug}/?gift=not-a-real-token`)
            .redirects(0)
            .expect(301);

        assert.match(res.headers.location, new RegExp(`^/${slug}/?$`));
        assert.doesNotMatch(res.headers.location, /gift=/);
        // The 301 itself must not be cached, so a reset link can't poison
        // subsequent requests via a stale browser-cached redirect.
        assert.match(res.headers['cache-control'], /no-store/);
    });

    it('unlocks a paid page with a valid ?gift token on its canonical URL', async function () {
        // The feature works on pages too, not just posts — same entry controller.
        await request
            .get(`/${pageSlug}/?gift=${pageToken}`)
            .expect(200)
            .expect(assertUnlocked);
    });

    it('301s a paid page, dropping ?gift, when the token is invalid', async function () {
        const res = await request
            .get(`/${pageSlug}/?gift=not-a-real-token`)
            .redirects(0)
            .expect(301);

        assert.match(res.headers.location, new RegExp(`^/${pageSlug}/?$`));
        assert.doesNotMatch(res.headers.location, /gift=/);
    });

    it('does not unlock a different post: a token for post A 301s away from post B', async function () {
        // Defence in depth: appending a valid gift token to another post's URL
        // must never reveal that post's gated content — the token is verified
        // against the entry that lives at the request URL.
        const res = await request
            .get(`/${otherSlug}/?gift=${token}`)
            .redirects(0)
            .expect(301);

        assert.match(res.headers.location, new RegExp(`^/${otherSlug}/?$`));
        assert.doesNotMatch(res.headers.location, /gift=/);
    });

    it('preserves other query params when stripping an invalid ?gift', async function () {
        const res = await request
            .get(`/${slug}/?ref=newsletter&gift=not-a-real-token`)
            .redirects(0)
            .expect(301);

        assert.match(res.headers.location, /ref=newsletter/);
        assert.doesNotMatch(res.headers.location, /gift=/);
    });

    it('strips a malformed (non-string) ?gift param without looping', async function () {
        // `?gift[]=x` parses to an array, not a token. It must canonicalise to
        // the clean URL — not redirect to itself and loop.
        const res = await request
            .get(`/${slug}/?gift[]=x`)
            .redirects(0)
            .expect(301);

        assert.match(res.headers.location, new RegExp(`^/${slug}/?$`));
        assert.doesNotMatch(res.headers.location, /\?/, 'the malformed param is stripped, leaving no query string');
    });

    it('does not expose the synthesized member to template rendering (@member stays anonymous)', async function () {
        // The shim unlocks gated content as the entry-lookup read context only —
        // it must never surface as @member. The test theme renders member state,
        // which stays anonymous even on an unlocked gift view.
        const res = await request
            .get(`/${slug}/?gift=${token}`)
            .expect(200)
            .expect(assertUnlocked);

        assert.match(res.text, /gh-test-member-state">anonymous</, '@member must stay anonymous on a gift view');
    });

    describe('the gift_link analytics dimension', function () {
        // The web-analytics tracker only carries the gift token once the entry
        // controller has verified it and flagged the render. An unverified or
        // forged token is 301'd to the canonical URL before any render, so it can
        // never reach analytics — these tests prove that end to end.
        it('emits the verified token as tb_gift_link on a valid gift read', async function () {
            const res = await request
                .get(`/${slug}/?gift=${token}`)
                .expect(200);

            assert.ok(
                res.text.includes(`tb_gift_link="${token}"`),
                'the verified token is sent as the gift_link dimension'
            );
        });

        it('emits an empty tb_gift_link on the canonical (non-gift) URL', async function () {
            const res = await request
                .get(`/${slug}/`)
                .expect(200);

            assert.match(res.text, /tb_gift_link=""/, 'a normal read carries no gift dimension');
        });

        it('keeps an invalid token out of analytics — the 301 strips it and the canonical render carries none', async function () {
            // Follow the 301 to the canonical URL it strips to.
            const res = await request
                .get(`/${slug}/?gift=not-a-real-token`)
                .redirects(1)
                .expect(200);

            assert.match(res.text, /tb_gift_link=""/, 'the canonical render carries no gift dimension');
            assert.ok(!res.text.includes('not-a-real-token'), 'the forged token never appears in the response');
        });

        it('keeps a token for another post out of that post’s analytics', async function () {
            // Post A's token on post B 301s to B's canonical URL, which must not
            // carry A's token as B's gift dimension.
            const res = await request
                .get(`/${otherSlug}/?gift=${token}`)
                .redirects(1)
                .expect(200);

            assert.match(res.text, /tb_gift_link=""/, 'B’s render carries no gift dimension');
            assert.ok(!res.text.includes(token), 'A’s token never appears in B’s response');
        });
    });
});
