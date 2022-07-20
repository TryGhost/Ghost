// # Default Frontend Routing Test
// These tests check the default out-of-the-box behaviour of Ghost is working as expected.

// Test Structure
// As it stands, these tests depend on the database, and as such are integration tests.
// Mocking out the models to not touch the DB would turn these into unit tests, and should probably be done in future,
// But then again testing real code, rather than mock code, might be more useful...
const should = require('should');
const sinon = require('sinon');
const supertest = require('supertest');
const moment = require('moment');
const cheerio = require('cheerio');
const _ = require('lodash');
const testUtils = require('../utils');
const configUtils = require('../utils/configUtils');
const settingsCache = require('../../core/shared/settings-cache');
const origCache = _.cloneDeep(settingsCache);

function assertCorrectFrontendHeaders(res) {
    should.not.exist(res.headers['x-cache-invalidate']);
    should.not.exist(res.headers['X-CSRF-Token']);
    should.not.exist(res.headers['set-cookie']);
    should.exist(res.headers.date);
}

describe('Default Frontend routing', function () {
    let request;

    afterEach(function () {
        sinon.restore();
    });

    before(async function () {
        await testUtils.startGhost();
        request = supertest.agent(configUtils.config.get('url'));
    });

    describe('Error', function () {
        it('should 404 for unknown post', async function () {
            await request.get('/spectacular/')
                .expect('Cache-Control', testUtils.cacheRules.private)
                .expect(404)
                .expect(/Page not found/)
                .expect(assertCorrectFrontendHeaders);
        });

        it('should 404 for unknown file', async function () {
            await request.get('/content/images/some/file/that/doesnt-exist.jpg')
                .expect('Cache-Control', testUtils.cacheRules.private)
                .expect(404)
                .expect(/Image not found/)
                .expect(assertCorrectFrontendHeaders);
        });
    });

    describe('Main Routes', function () {
        it('/ should respond with valid HTML', async function () {
            await request.get('/')
                .expect('Content-Type', /html/)
                .expect('Cache-Control', testUtils.cacheRules.public)
                .expect(200)
                .expect(assertCorrectFrontendHeaders)
                .expect((res) => {
                    const $ = cheerio.load(res.text);

                    // NOTE: "Ghost" is the title from the settings.
                    $('title').text().should.equal('Ghost');

                    $('body.home-template').length.should.equal(1);
                    $('article.post').length.should.equal(7);
                    $('article.tag-getting-started').length.should.equal(7);

                    res.text.should.not.containEql('__GHOST_URL__');
                });
        });

        it('/author/ghost/ should respond with valid HTML', async function () {
            await request.get('/author/ghost/')
                .expect('Content-Type', /html/)
                .expect('Cache-Control', testUtils.cacheRules.public)
                .expect(200)
                .expect(assertCorrectFrontendHeaders)
                .expect((res) => {
                    const $ = cheerio.load(res.text);

                    // NOTE: "Ghost" is the title from the settings.
                    $('title').text().should.equal('Ghost - Ghost');

                    $('body.author-template').length.should.equal(1);
                    $('article.post').length.should.equal(7);
                    $('article.tag-getting-started').length.should.equal(7);

                    res.text.should.not.containEql('__GHOST_URL__');
                });
        });

        it('/tag/getting-started/ should respond with valid HTML', async function () {
            await request.get('/tag/getting-started/')
                .expect('Content-Type', /html/)
                .expect('Cache-Control', testUtils.cacheRules.public)
                .expect(200)
                .expect(assertCorrectFrontendHeaders)
                .expect((res) => {
                    const $ = cheerio.load(res.text);

                    // NOTE: "Ghost" is the title from the settings.
                    $('title').text().should.equal('Getting Started - Ghost');

                    $('body.tag-template').length.should.equal(1);
                    $('article.post').length.should.equal(7);
                    $('article.tag-getting-started').length.should.equal(7);

                    res.text.should.not.containEql('__GHOST_URL__');
                });
        });
    });

    describe('Single post', function () {
        it('/welcome/ should respond with valid HTML', async function () {
            await request.get('/welcome/')
                .expect('Content-Type', /html/)
                .expect('Cache-Control', testUtils.cacheRules.public)
                .expect(200)
                .expect(assertCorrectFrontendHeaders)
                .expect((res) => {
                    // Test that head and body have rendered something...
                    res.text.should.containEql('<title>Start here for a quick overview of everything you need to know</title>');
                    res.text.should.match(/<h1[^>]*?>Start here for a quick overview of everything you need to know<\/h1>/);
                    // We should write a single test for this, or encapsulate it as an assertion
                    // E.g. res.text.should.not.containInvalidUrls()
                    res.text.should.not.containEql('__GHOST_URL__');
                });
        });

        it('should not work with date permalinks', async function () {
            // get today's date
            const date = moment().format('YYYY/MM/DD');

            await request.get('/' + date + '/welcome/')
                .expect('Cache-Control', testUtils.cacheRules.private)
                .expect(404)
                .expect(/Page not found/)
                .expect(assertCorrectFrontendHeaders);
        });
    });

    describe('Post edit', function () {
        it('should redirect to editor', async function () {
            await request.get('/welcome/edit/')
                .expect('Location', /ghost\/#\/editor\/\w+/)
                .expect('Cache-Control', testUtils.cacheRules.public)
                .expect(302)
                .expect(assertCorrectFrontendHeaders);
        });

        it('should 404 for non-edit parameter', async function () {
            await request.get('/welcome/notedit/')
                .expect('Cache-Control', testUtils.cacheRules.private)
                .expect(404)
                .expect(/Page not found/)
                .expect(assertCorrectFrontendHeaders);
        });

        describe('Admin Redirects Disabled', function () {
            before(async function () {
                configUtils.set('admin:redirects', false);

                await testUtils.startGhost({forceStart: true});
                request = supertest.agent(configUtils.config.get('url'));
            });

            after(async function () {
                configUtils.restore();

                await testUtils.startGhost({forceStart: true});
                request = supertest.agent(configUtils.config.get('url'));
            });

            it('/edit/ should NOT redirect to the editor', async function () {
                await request.get('/welcome/edit/')
                    .expect('Cache-Control', testUtils.cacheRules.private)
                    .expect(404)
                    .expect(assertCorrectFrontendHeaders);
            });
        });
    });

    describe('AMP post', function () {
        describe('AMP Enabled', function () {
            beforeEach(function () {
                sinon.stub(settingsCache, 'get').callsFake(function (key, options) {
                    if (key === 'amp' && !options) {
                        return true;
                    }
                    return origCache.get(key, options);
                });
            });
            it('should respond with html for valid url', async function () {
                await request.get('/welcome/amp/')
                    .expect('Content-Type', /html/)
                    .expect('Cache-Control', testUtils.cacheRules.public)
                    .expect(200)
                    .expect(assertCorrectFrontendHeaders)
                    .expect((res) => {
                        const $ = cheerio.load(res.text);

                        $('.post-title').text().should.equal('Start here for a quick overview of everything you need to know');

                        $('.content .post').length.should.equal(1);
                        $('.powered').text().should.equal(' Published with Ghost');
                        $('body.amp-template').length.should.equal(1);
                        $('article.post').length.should.equal(1);

                        $('style[amp-custom]').length.should.equal(1);

                        // This asserts we should have some content (and not [object Promise] !)
                        $('.post-content p').length.should.be.greaterThan(0);

                        res.text.should.containEql(':root {--ghost-accent-color: #FF1A75;}');
                        res.text.should.not.containEql('__GHOST_URL__');
                    });
            });

            it('should not work with date permalinks', async function () {
                // get today's date
                const date = moment().format('YYYY/MM/DD');

                await request.get('/' + date + '/welcome/amp/')
                    .expect('Cache-Control', testUtils.cacheRules.private)
                    .expect(404)
                    .expect(/Page not found/)
                    .expect(assertCorrectFrontendHeaders);
            });
        });

        describe('AMP Disabled', function () {
            beforeEach(function () {
                sinon.stub(settingsCache, 'get').callsFake(function (key, options) {
                    if (key === 'amp' && !options) {
                        return false;
                    }
                    return origCache.get(key, options);
                });
            });
            it('/amp/ should redirect to regular post, including any query params', async function () {
                await request.get('/welcome/amp/?q=a')
                    .expect('Location', '/welcome/?q=a')
                    .expect(301)
                    .expect(assertCorrectFrontendHeaders);
            });
        });
    });

    describe('RSS', function () {
        it('should 301 redirect with CC=1year without slash', function () {
            request.get('/rss')
                .expect('Location', '/rss/')
                .expect('Cache-Control', testUtils.cacheRules.year)
                .expect(301)
                .expect(assertCorrectFrontendHeaders);
        });

        it('should get 301 redirect with CC=1year to /rss/ from /feed/', function () {
            request.get('/feed/')
                .expect('Location', '/rss/')
                .expect('Cache-Control', testUtils.cacheRules.year)
                .expect(301)
                .expect(assertCorrectFrontendHeaders);
        });

        it('/rss/ should serve an RSS feed', async function () {
            await request.get('/rss/')
                .expect(200)
                .expect('Cache-Control', testUtils.cacheRules.public)
                .expect('Content-Type', 'text/xml; charset=utf-8')
                .expect(assertCorrectFrontendHeaders)
                .expect((res) => {
                    res.text.should.match(/<!\[CDATA\[Start here for a quick overview of everything you need to know\]\]>/);
                    res.text.should.not.containEql('__GHOST_URL__');
                });
        });

        it('/author/ghost/rss/ should serve an RSS feed', async function () {
            await request.get('/author/ghost/rss/')
                .expect(200)
                .expect('Cache-Control', testUtils.cacheRules.public)
                .expect('Content-Type', 'text/xml; charset=utf-8')
                .expect(assertCorrectFrontendHeaders)
                .expect((res) => {
                    res.text.should.match(/<!\[CDATA\[Start here for a quick overview of everything you need to know\]\]>/);
                    res.text.should.not.containEql('__GHOST_URL__');
                });
        });

        it('/tag/getting-started/rss/ should serve an RSS feed', async function () {
            await request.get('/tag/getting-started/rss/')
                .expect(200)
                .expect('Cache-Control', testUtils.cacheRules.public)
                .expect('Content-Type', 'text/xml; charset=utf-8')
                .expect(assertCorrectFrontendHeaders)
                .expect((res) => {
                    res.text.should.match(/<!\[CDATA\[Start here for a quick overview of everything you need to know\]\]>/);
                    res.text.should.not.containEql('__GHOST_URL__');
                });
        });
    });

    describe('Static assets', function () {
        it('should retrieve theme assets', async function () {
            await request.get('/assets/built/screen.css')
                .expect('Cache-Control', testUtils.cacheRules.year)
                .expect(200)
                .expect(assertCorrectFrontendHeaders);
        });

        it('should retrieve default robots.txt', async function () {
            const res = await request.get('/robots.txt')
                .expect('Cache-Control', testUtils.cacheRules.hour)
                .expect('ETag', /[0-9a-f]{32}/i)
                .expect(200)
                .expect(assertCorrectFrontendHeaders);

            // The response here is a publicly documented format users rely on
            // In case it's changed remember to update the docs at https://ghost.org/help/modifying-robots-txt/
            res.text.should.equal(
                'User-agent: *\n' +
                'Sitemap: http://127.0.0.1:2369/sitemap.xml\nDisallow: /ghost/\n' +
                'Disallow: /p/\n' +
                'Disallow: /email/\n'
            );
        });

        it('should retrieve default favicon.ico', async function () {
            await request.get('/favicon.ico')
                .expect('Cache-Control', testUtils.cacheRules.day)
                .expect('ETag', /[0-9a-f]{32}/i)
                .expect(200)
                .expect(assertCorrectFrontendHeaders);
        });
    });

    describe('Site Map', function () {
        before(async function () {
            await testUtils.clearData();
            await testUtils.initData();
            await testUtils.initFixtures('posts');
        });

        it('should serve sitemap.xml', async function () {
            await request.get('/sitemap.xml')
                .expect(200)
                .expect('Cache-Control', testUtils.cacheRules.hour)
                .expect('Content-Type', 'text/xml; charset=utf-8')
                .expect(assertCorrectFrontendHeaders)
                .expect((res) => {
                    res.text.should.match(/sitemapindex/);
                    res.text.should.not.containEql('__GHOST_URL__');
                });
        });

        it('should serve sitemap-posts.xml', async function () {
            await request.get('/sitemap-posts.xml')
                .expect(200)
                .expect('Cache-Control', testUtils.cacheRules.hour)
                .expect('Content-Type', 'text/xml; charset=utf-8')
                .expect(assertCorrectFrontendHeaders)
                .expect((res) => {
                    res.text.should.match(/urlset/);
                    res.text.should.not.containEql('__GHOST_URL__');
                });
        });

        it('should serve sitemap-pages.xml', async function () {
            await request.get('/sitemap-pages.xml')
                .expect(200)
                .expect('Cache-Control', testUtils.cacheRules.hour)
                .expect('Content-Type', 'text/xml; charset=utf-8')
                .expect(assertCorrectFrontendHeaders)
                .expect((res) => {
                    res.text.should.match(/urlset/);
                    // CASE: the index page should always be present in pages sitemap
                    res.text.should.containEql('<loc>http://127.0.0.1:2369/</loc>');
                    res.text.should.not.containEql('__GHOST_URL__');
                });
        });

        it('should serve sitemap-tags.xml', async function () {
            await request.get('/sitemap-tags.xml')
                .expect(200)
                .expect('Cache-Control', testUtils.cacheRules.hour)
                .expect('Content-Type', 'text/xml; charset=utf-8')
                .expect(assertCorrectFrontendHeaders)
                .expect((res) => {
                    res.text.should.match(/urlset/);
                    res.text.should.not.containEql('__GHOST_URL__');
                });
        });

        it('should serve sitemap-users.xml', async function () {
            await request.get('/sitemap-users.xml')
                .expect(200)
                .expect('Cache-Control', testUtils.cacheRules.hour)
                .expect('Content-Type', 'text/xml; charset=utf-8')
                .expect(assertCorrectFrontendHeaders)
                .expect((res) => {
                    res.text.should.match(/urlset/);
                    res.text.should.not.containEql('__GHOST_URL__');
                });
        });

        it('should serve sitemap.xsl', async function () {
            await request.get('/sitemap.xsl')
                .expect(200)
                .expect('Cache-Control', testUtils.cacheRules.day)
                .expect('Content-Type', 'text/xsl')
                .expect(assertCorrectFrontendHeaders)
                .expect((res) => {
                    res.text.should.match(/urlset/);
                    res.text.should.not.containEql('__GHOST_URL__');
                });
        });
    });

    describe('Private Blogging', function () {
        beforeEach(function () {
            sinon.stub(settingsCache, 'get').callsFake(function (key, options) {
                if (key === 'is_private') {
                    return true;
                }
                return origCache.get(key, options);
            });
        });

        it('/ should redirect to /private/', async function () {
            await request.get('/')
                .expect('Location', '/private/?r=%2F')
                .expect(302)
                .expect(assertCorrectFrontendHeaders);
        });

        it('/welcome/ should redirect to /private/', async function () {
            await request.get('/welcome/')
                .expect('Location', '/private/?r=%2Fwelcome%2F')
                .expect(302)
                .expect(assertCorrectFrontendHeaders);
        });

        it('/private/?r=%2Fwelcome%2F should not redirect', async function () {
            await request.get('/private/?r=%2Fwelcome%2F')
                .expect(200)
                .expect(assertCorrectFrontendHeaders);
        });

        it('should redirect, NOT 404 for private route with extra path', async function () {
            await request.get('/private/welcome/')
                .expect('Location', '/private/?r=%2Fprivate%2Fwelcome%2F')
                .expect(302)
                .expect(assertCorrectFrontendHeaders);
        });

        it('should still serve private RSS feed', async function () {
            await request.get(`/${settingsCache.get('public_hash')}/rss/`)
                .expect(200)
                .expect('Cache-Control', testUtils.cacheRules.private)
                .expect('Content-Type', 'text/xml; charset=utf-8')
                .expect(assertCorrectFrontendHeaders)
                .expect((res) => {
                    res.text.should.match(/<!\[CDATA\[Start here for a quick overview of everything you need to know\]\]>/);
                });
        });

        it('should still serve private tag RSS feed', async function () {
            await request.get(`/tag/getting-started/${settingsCache.get('public_hash')}/rss/`)
                .expect(200)
                .expect('Cache-Control', testUtils.cacheRules.private)
                .expect('Content-Type', 'text/xml; charset=utf-8')
                .expect(assertCorrectFrontendHeaders)
                .expect((res) => {
                    res.text.should.match(/<!\[CDATA\[Start here for a quick overview of everything you need to know\]\]>/);
                });
        });

        it('should redirect, NOT 404 for private tag RSS feed with extra path', async function () {
            await request.get(`/tag/getting-started/${settingsCache.get('public_hash')}/rss/hack/`)
                .expect('Location', `/private/?r=%2Ftag%2Fgetting-started%2F${settingsCache.get('public_hash')}%2Frss%2Fhack%2F`)
                .expect(302)
                .expect(assertCorrectFrontendHeaders);
        });

        // NOTE: this case is covered by extra error handling, and cannot be unit tested
        it('should redirect, NOT 404 for unknown private RSS feed', async function () {
            // NOTE: the redirect will be to /hack/rss because we strip the hash from the URL before trying to serve RSS
            // This isn't ideal, but it's better to expose this internal logic than it is a 404 page
            await request.get(`/hack/${settingsCache.get('public_hash')}/rss/`)
                .expect('Location', '/private/?r=%2Fhack%2Frss%2F')
                .expect(302)
                .expect(assertCorrectFrontendHeaders);
        });

        // NOTE: this test extends the unit test, checking that there is no other robots.txt middleware overriding private blogging
        it('should serve private robots.txt', async function () {
            await request.get('/robots.txt')
                .expect('Cache-Control', 'public, max-age=3600000')
                .expect(200)
                .expect(assertCorrectFrontendHeaders)
                .expect((res) => {
                    res.text.should.match('User-agent: *\nDisallow: /');
                });
        });
    });
});
