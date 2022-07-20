// # Frontend Route tests
// As it stands, these tests depend on the database, and as such are integration tests.
// Mocking out the models to not touch the DB would turn these into unit tests, and should probably be done in future,
// But then again testing real code, rather than mock code, might be more useful...
const should = require('should');

const sinon = require('sinon');
const supertest = require('supertest');
const cheerio = require('cheerio');
const testUtils = require('../utils');
const config = require('../../core/shared/config');
let request;

function assertCorrectFrontendHeaders(res) {
    should.not.exist(res.headers['x-cache-invalidate']);
    should.not.exist(res.headers['X-CSRF-Token']);
    should.not.exist(res.headers['set-cookie']);
    should.exist(res.headers.date);
}

describe('Frontend Routing: Preview Routes', function () {
    async function addPosts() {
        await testUtils.clearData();
        await testUtils.initData();
        await testUtils.fixtures.insertPostsAndTags();
    }

    afterEach(function () {
        sinon.restore();
    });

    before(async function () {
        await testUtils.startGhost();
        request = supertest.agent(config.get('url'));
    });

    before(addPosts);

    it('should display draft posts accessed via uuid', async function () {
        await request.get('/p/d52c42ae-2755-455c-80ec-70b2ec55c903/')
            .expect('Content-Type', /html/)
            .expect(200)
            .expect(assertCorrectFrontendHeaders)
            .expect((res) => {
                const $ = cheerio.load(res.text);

                should.not.exist(res.headers['x-cache-invalidate']);
                should.not.exist(res.headers['X-CSRF-Token']);
                should.not.exist(res.headers['set-cookie']);
                should.exist(res.headers.date);

                $('title').text().should.equal('Not finished yet');
                $('meta[name="description"]').attr('content').should.equal('meta description for draft post');

                // @TODO: use theme from fixtures and don't rely on content/themes/casper
                // $('.content .post').length.should.equal(1);
                // $('.poweredby').text().should.equal('Proudly published with Ghost');
                // $('body.post-template').length.should.equal(1);
                // $('article.post').length.should.equal(1);
            });
    });

    it('should redirect draft posts accessed via uuid and edit to admin post edit screen', async function () {
        await request.get('/p/d52c42ae-2755-455c-80ec-70b2ec55c903/edit/')
            .expect('Content-Type', /text\/plain/)
            .expect(302)
            .expect('Location', /ghost\/#\/editor\/post\/\w+/)
            .expect('Cache-Control', testUtils.cacheRules.public)
            .expect(assertCorrectFrontendHeaders);
    });

    it('should redirect draft page accessed via uuid and edit to admin page edit screen', async function () {
        await request.get('/p/d52c42ae-2755-455c-80ec-70b2ec55c904/edit/')
            .expect('Content-Type', /text\/plain/)
            .expect(302)
            .expect('Location', /ghost\/#\/editor\/page\/\w+/)
            .expect('Cache-Control', testUtils.cacheRules.public)
            .expect(assertCorrectFrontendHeaders);
    });

    it('should redirect published posts to their live url', async function () {
        await request.get('/p/2ac6b4f6-e1f3-406c-9247-c94a0496d39d/')
            .expect(301)
            .expect('Location', '/short-and-sweet/')
            .expect('Cache-Control', testUtils.cacheRules.year)
            .expect(assertCorrectFrontendHeaders);
    });

    it('404s unknown uuids', async function () {
        request.get('/p/aac6b4f6-e1f3-406c-9247-c94a0496d39f/')
            .expect(404)
            .expect(assertCorrectFrontendHeaders);
    });
});
