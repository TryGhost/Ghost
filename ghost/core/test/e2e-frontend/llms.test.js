const assert = require('node:assert/strict');
const sinon = require('sinon');
const supertest = require('supertest');

const testUtils = require('../utils');
const configUtils = require('../utils/config-utils');
const settingsCache = require('../../core/shared/settings-cache');

function assertCorrectFrontendHeaders(res) {
    assert.equal(res.headers['x-cache-invalidate'], undefined);
    assert.equal(res.headers['x-csrf-token'], undefined);
    assert.equal(res.headers['set-cookie'], undefined);
    assert.ok(res.headers.date);
}

describe('LLMS frontend routes', function () {
    let request;

    before(async function () {
        await testUtils.startGhost();
        request = supertest.agent(configUtils.config.get('url'));
    });

    afterEach(function () {
        sinon.restore();
    });

    it('serves /llms.txt with discovery headers', async function () {
        const res = await request.get('/llms.txt')
            .expect(200)
            .expect('Cache-Control', testUtils.cacheRules.hour)
            .expect('Content-Type', /text\/plain/)
            .expect('X-Llms-Txt', '/llms.txt')
            .expect(assertCorrectFrontendHeaders);

        assert.match(res.headers.link, /<\/llms\.txt>; rel="llms-txt"/);
        assert.match(res.headers.link, /<\/llms-full\.txt>; rel="llms-full-txt"/);
        assert.match(res.text, /^# /m);
        assert.match(res.text, /## Pages/);
        assert.match(res.text, /## Posts/);
        assert.match(res.text, /\[.*\]\(http:\/\/127\.0\.0\.1:\d+\/welcome\.md\)/);
    });

    it('serves /.well-known/llms.txt as an alias', async function () {
        const [rootRes, aliasRes] = await Promise.all([
            request.get('/llms.txt'),
            request.get('/.well-known/llms.txt')
        ]);

        assert.equal(aliasRes.status, 200);
        assert.equal(aliasRes.text, rootRes.text);
    });

    it('serves /llms-full.txt', async function () {
        const res = await request.get('/llms-full.txt')
            .expect(200)
            .expect('Cache-Control', testUtils.cacheRules.hour)
            .expect('Content-Type', /text\/plain/)
            .expect(assertCorrectFrontendHeaders);

        assert.match(res.text, /## Pages/);
        assert.match(res.text, /## Posts/);
        assert.match(res.text, /### Start here for a quick overview of everything you need to know/);
        assert.match(res.text, /URL: http:\/\/127\.0\.0\.1:\d+\/welcome\//);
    });

    it('serves markdown for a public post via .md URL', async function () {
        const res = await request.get('/welcome.md')
            .expect(200)
            .expect('Content-Type', /text\/markdown/)
            .expect('Content-Location', '/welcome.md')
            .expect('X-Llms-Txt', '/llms.txt')
            .expect(assertCorrectFrontendHeaders);

        assert.match(res.text, /^> ## Content Index/m);
        assert.match(res.text, /^# Start here for a quick overview of everything you need to know/m);
        assert.match(res.text, /- Published: /);
    });

    it('serves markdown for a public post via Accept negotiation on the canonical URL', async function () {
        const res = await request.get('/welcome/')
            .set('Accept', 'text/markdown')
            .expect(200)
            .expect('Content-Type', /text\/markdown/)
            .expect(assertCorrectFrontendHeaders);

        assert.match(res.text, /^> ## Content Index/m);
        assert.match(res.text, /^# Start here for a quick overview of everything you need to know/m);
    });

    it('respects private-site behavior for llms routes', async function () {
        const originalSettingsCacheGet = settingsCache.get;

        sinon.stub(settingsCache, 'get').callsFake(function (key, options) {
            if (key === 'is_private') {
                return true;
            }

            return originalSettingsCacheGet.call(this, key, options);
        });

        await request.get('/llms.txt')
            .expect(302)
            .expect('Location', '/private/?r=%2Fllms.txt')
            .expect(assertCorrectFrontendHeaders);
    });

    it('disables llms routes and discovery headers when llms_enabled is false', async function () {
        const originalSettingsCacheGet = settingsCache.get;

        sinon.stub(settingsCache, 'get').callsFake(function (key, options) {
            if (key === 'llms_enabled') {
                return false;
            }

            return originalSettingsCacheGet.call(this, key, options);
        });

        await request.get('/llms.txt')
            .expect(302)
            .expect('Location', '/')
            .expect(assertCorrectFrontendHeaders);

        await request.get('/welcome.md')
            .expect(302)
            .expect('Location', '/welcome/')
            .expect(assertCorrectFrontendHeaders);

        const res = await request.get('/welcome/')
            .expect(200)
            .expect(assertCorrectFrontendHeaders);

        assert.equal(res.headers['x-llms-txt'], undefined);
        assert.ok(!res.headers.link || !res.headers.link.includes('rel="llms-txt"'));
    });
});
