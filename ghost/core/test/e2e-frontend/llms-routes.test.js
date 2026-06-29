// # llms.txt Frontend Routing Tests
// The llms service fetches content through the public Posts/Pages API with
// narrowed `fields` + `formats` options. These tests boot a full Ghost
// instance so the request runs through the real controllers and serializers,
// covering the fields/formats/url interaction the unit tests mock away.
const assert = require('node:assert/strict');
const sinon = require('sinon');
const supertest = require('supertest');
const testUtils = require('../utils');
const configUtils = require('../utils/config-utils');
const settingsCache = require('../../core/shared/settings-cache');

describe('llms.txt routing', function () {
    let request;
    let siteUrl;

    beforeAll(async function () {
        await testUtils.startGhost();
        siteUrl = configUtils.config.get('url').replace(/\/$/, '');
        request = supertest.agent(configUtils.config.get('url'));
    });

    beforeEach(function () {
        const originalGet = settingsCache.get;
        sinon.stub(settingsCache, 'get').callsFake(function (key, options) {
            if (key === 'labs') {
                return {llmsTxt: true};
            }

            return originalGet(key, options);
        });
    });

    afterEach(function () {
        sinon.restore();
    });

    it('serves llms.txt with published public entries and absolute urls', async function () {
        const res = await request.get('/llms.txt')
            .expect('Content-Type', /text\/plain/)
            .expect(200);

        // entries are linked via absolute urls resolved by the public API serializer
        assert.ok(res.text.includes(`[About this site](${siteUrl}/about.md)`), 'expected absolute .md link for the about page');
        assert.ok(res.text.includes(`[Start here for a quick overview of everything you need to know](${siteUrl}/welcome.md)`), 'expected absolute .md link for the welcome post');

        // descriptions come from plaintext, which is requested via `formats`
        // on top of the narrowed `fields`
        assert.match(res.text, /\[Start here for a quick overview of everything you need to know\]\([^)]+\) - We've crammed the most important information/);

        // the .md discoverability line and the llms-full link in Optional
        assert.match(res.text, /Append `\.md` to any post or page URL/);
        assert.ok(res.text.includes(`[Full content of pages and posts](${siteUrl}/llms-full.txt)`), 'expected llms-full link in Optional');
    });

    it('serves llms-full.txt with entry bodies and absolute urls', async function () {
        const res = await request.get('/llms-full.txt')
            .expect('Content-Type', /text\/plain/)
            .expect(200);

        assert.match(res.text, /### About this site/);
        assert.match(res.text, /### Start here for a quick overview of everything you need to know/);
        assert.ok(res.text.includes(`URL: ${siteUrl}/about/`), 'expected absolute url for the about page entry');

        // entry bodies are rendered from html, which is requested via
        // `formats` on top of the narrowed `fields`
        assert.match(res.text, /An about page is a great example of one you might want to set up early on/);

        // the .md discoverability line appears in both files
        assert.match(res.text, /Append `\.md` to any post or page URL/);

        // truncation footer (if present) points at the sitemap, not /llms.txt
        assert.doesNotMatch(res.text, /Use `\/llms\.txt`/);
    });
});
