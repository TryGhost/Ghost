// # Frontend Route tests
// As it stands, these tests depend on the database, and as such are integration tests.
// Mocking out the models to not touch the DB would turn these into unit tests, and should probably be done in future,
// But then again testing real code, rather than mock code, might be more useful...
const assert = require('node:assert/strict');
const {assertExists} = require('../utils/assertions');

const sinon = require('sinon');
const supertest = require('supertest');
const cheerio = require('cheerio');
const testUtils = require('../utils');
const config = require('../../core/shared/config');
const {DateTime} = require('luxon');
let request;

function assertCorrectFrontendHeaders(res) {
    assert.equal(res.headers['x-cache-invalidate'], undefined);
    assert.equal(res.headers['X-CSRF-Token'], undefined);
    assert.equal(res.headers['set-cookie'], undefined);
    assertExists(res.headers.date);
}

function assertPaywallRendered(res) {
    assert.match(res.text, /Before paywall/, 'Content before paywall should be rendered');
    assert.doesNotMatch(res.text, /After paywall/, 'Content after paywall should not be rendered');
    assert.match(res.text, /This post is for/, 'Paywall should be rendered');
}

function assertNoPaywallRendered(res) {
    assert.match(res.text, /Before paywall/, 'Content before paywall should be rendered');
    assert.match(res.text, /After paywall/, 'Content after paywall should be rendered');
    assert.doesNotMatch(res.text, /This post is for/, 'Paywall should not be rendered');
}

describe('Frontend Routing: Preview Routes', function () {
    async function addPosts() {
        await testUtils.teardownDb();
        await testUtils.initData();
        await testUtils.fixtures.insertExtraTiers();
        await testUtils.fixtures.insertPostsAndTags();
        await testUtils.fixtures.insertGatedPosts();
    }

    afterEach(function () {
        sinon.restore();
    });

    before(async function () {
        await testUtils.startGhost();
        request = supertest.agent(config.get('url'));
    });

    after(async function () {
        await testUtils.stopGhost();
    });

    before(addPosts);

    it('should display draft posts accessed via uuid', async function () {
        await request.get('/p/d52c42ae-2755-455c-80ec-70b2ec55c903/')
            .expect('Content-Type', /html/)
            .expect(200)
            .expect(assertCorrectFrontendHeaders)
            .expect((res) => {
                const $ = cheerio.load(res.text);

                assert.equal(res.headers['x-cache-invalidate'], undefined);
                assert.equal(res.headers['X-CSRF-Token'], undefined);
                assert.equal(res.headers['set-cookie'], undefined);
                assertExists(res.headers.date);

                assert.equal($('title').text(), 'Not finished yet');
                assert.equal($('meta[name="description"]').attr('content'), 'meta description for draft post');

                // @TODO: use theme from fixtures and don't rely on content/themes/casper
                // assert.equal($('.content .post').length, 1);
                // assert.equal($('.poweredby').text(), 'Proudly published with Ghost');
                // assert.equal($('body.post-template').length, 1);
                // assert.equal($('article.post').length, 1);
            });
    });

    it('should assume the user has access to the post if member_status is not provided', async function () {
        await request.get('/p/d52c42ae-2755-455c-80ec-70b2ec55c905/')
            .expect('Content-Type', /html/)
            .expect(200)
            .expect(assertCorrectFrontendHeaders)
            .expect(assertNoPaywallRendered);
    });

    it('should render draft as an anonymous user with ?member_status=anonymous', async function () {
        await request.get('/p/d52c42ae-2755-455c-80ec-70b2ec55c905/?member_status=anonymous')
            .expect('Content-Type', /html/)
            .expect(200)
            .expect(assertCorrectFrontendHeaders)
            .expect(assertPaywallRendered);
    });

    it('should render draft as a member with access to the post if visibility is tiers and ?member_status=paid', async function () {
        await request.get('/p/d52c42ae-2755-455c-80ec-70b2ec55c906/?member_status=paid')
            .expect('Content-Type', /html/)
            .expect(200)
            .expect(assertCorrectFrontendHeaders)
            .expect(assertNoPaywallRendered);
    });

    it('should render draft as free member with ?member_status=free', async function () {
        await request.get('/p/d52c42ae-2755-455c-80ec-70b2ec55c905/?member_status=free')
            .expect('Content-Type', /html/)
            .expect(200)
            .expect(assertCorrectFrontendHeaders)
            .expect(assertPaywallRendered);
    });

    it('should render draft as paid member with ?member_status=paid', async function () {
        await request.get('/p/d52c42ae-2755-455c-80ec-70b2ec55c905/?member_status=paid')
            .expect('Content-Type', /html/)
            .expect(200)
            .expect(assertCorrectFrontendHeaders)
            .expect(assertNoPaywallRendered);
    });

    it('should redirect draft posts accessed via uuid and edit to admin post edit screen', async function () {
        await request.get('/p/d52c42ae-2755-455c-80ec-70b2ec55c903/edit/')
            .expect('Content-Type', /text\/plain/)
            .expect(302)
            .expect('Location', /ghost\/#\/editor\/post\/\w+/)
            .expect('Cache-Control', testUtils.cacheRules.noCache)
            .expect(assertCorrectFrontendHeaders);
    });

    it('should redirect draft page accessed via uuid and edit to admin page edit screen', async function () {
        await request.get('/p/d52c42ae-2755-455c-80ec-70b2ec55c904/edit/')
            .expect('Content-Type', /text\/plain/)
            .expect(302)
            .expect('Location', /ghost\/#\/editor\/page\/\w+/)
            .expect('Cache-Control', testUtils.cacheRules.noCache)
            .expect(assertCorrectFrontendHeaders);
    });

    it('should redirect published posts to their live url', async function () {
        await request.get('/p/2ac6b4f6-e1f3-406c-9247-c94a0496d39d/')
            .expect(301)
            .expect('Location', '/short-and-sweet/')
            .expect('Cache-Control', testUtils.cacheRules.year)
            .expect(assertCorrectFrontendHeaders);
    });

    it('should redirect published posts to their live url with ?member_status=paid', async function () {
        await request.get('/p/2ac6b4f6-e1f3-406c-9247-c94a0496d39d/?member_status=paid')
            .expect(301)
            .expect('Location', '/short-and-sweet/')
            .expect('Cache-Control', testUtils.cacheRules.year)
            .expect(assertCorrectFrontendHeaders);
    });

    it('should render scheduled email-only posts', async function () {
        const scheduledEmail = await testUtils.fixtures.insertPosts([{
            title: 'test newsletter',
            status: 'scheduled',
            published_at: DateTime.now().plus({days: 1}).toISODate(),
            posts_meta: {
                email_only: true
            }
        }]);

        await request.get(`/p/${scheduledEmail[0].get('uuid')}/`)
            .expect('Content-Type', /html/)
            .expect(200)
            .expect(assertCorrectFrontendHeaders);
    });

    it('should redirect sent email-only posts to /email/:uuid from /p/:uuid', async function () {
        const emailedPost = await testUtils.fixtures.insertPosts([{
            title: 'test newsletter',
            status: 'sent',
            posts_meta: {
                email_only: true
            }
        }]);

        await request.get(`/p/${emailedPost[0].get('uuid')}/`)
            .expect(301)
            .expect('Location', `/email/${emailedPost[0].get('uuid')}/`)
            .expect('Cache-Control', testUtils.cacheRules.year)
            .expect(assertCorrectFrontendHeaders);
    });

    it('404s unknown uuids', async function () {
        request.get('/p/aac6b4f6-e1f3-406c-9247-c94a0496d39f/')
            .expect(404)
            .expect(assertCorrectFrontendHeaders);
    });
});
