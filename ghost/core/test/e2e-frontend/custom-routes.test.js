const assert = require('node:assert/strict');
const {assertExists} = require('../utils/assertions');
const supertest = require('supertest');
const path = require('path');
const moment = require('moment');
const testUtils = require('../utils');
const configUtils = require('../utils/config-utils');

function assertCorrectFrontendHeaders(res) {
    assert.equal(res.headers['x-cache-invalidate'], undefined);
    assert.equal(res.headers['X-CSRF-Token'], undefined);
    assert.equal(res.headers['set-cookie'], undefined);
    assertExists(res.headers.date);
}

describe('Custom Frontend routing', function () {
    let request;

    before(async function () {
        const routesFilePath = path.join(configUtils.config.get('paths:appRoot'), 'test/utils/fixtures/settings/newroutes.yaml');

        await testUtils.startGhost({
            routesFilePath
        });
        request = supertest.agent(configUtils.config.get('url'));
    });

    after(function () {
        return testUtils.stopGhost();
    });

    it('serve welcome post with old permalink structure', function () {
        return request.get('/welcome/')
            .expect(404)
            .expect(assertCorrectFrontendHeaders);
    });

    it('serve welcome post with new permalink structure', function () {
        const year = moment().year();
        return request.get(`/blog/${year}/welcome/`)
            .expect(200)
            .expect(assertCorrectFrontendHeaders);
    });

    it('serve welcome post with new permalink structure and old date', function () {
        return request.get('/blog/2016/welcome/')
            .expect(301)
            .expect(assertCorrectFrontendHeaders);
    });

    it('serve rss', function () {
        return request.get('/blog/rss/')
            .expect(200)
            .expect(assertCorrectFrontendHeaders)
            .then(function (res) {
                const content = res.text;
                const todayMoment = moment();
                const year = todayMoment.format('YYYY');
                const postLink = `/blog/${year}/welcome/`;

                assert(content.indexOf(postLink) > 0);
            });
    });

    it('serve collection index', function () {
        return request.get('/blog/')
            .expect(200)
            .expect(assertCorrectFrontendHeaders);
    });

    it('serve tag', function () {
        return request.get('/category/getting-started/')
            .expect(200)
            .expect(assertCorrectFrontendHeaders);
    });

    it('should not serve empty sitemaps', async function () {
        await request.get('/sitemap-authors.xml')
            .expect(404)
            .expect(assertCorrectFrontendHeaders);
    });
});
