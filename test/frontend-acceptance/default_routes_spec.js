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
const config = require('../../core/shared/config');
const settingsCache = require('../../core/server/services/settings/cache');
const origCache = _.cloneDeep(settingsCache);

describe('Default Frontend routing', function () {
    let request;

    function doEnd(res) {
        should.not.exist(res.headers['x-cache-invalidate']);
        should.not.exist(res.headers['X-CSRF-Token']);
        should.not.exist(res.headers['set-cookie']);
        should.exist(res.headers.date);
    }

    afterEach(function () {
        sinon.restore();
    });

    before(async function () {
        await testUtils.startGhost();
        request = supertest.agent(config.get('url'));
    });

    describe('Error', function () {
        it('should 404 for unknown post', async function () {
            const res = await request.get('/spectacular/')
                .expect('Cache-Control', testUtils.cacheRules.private)
                .expect(404)
                .expect(/Page not found/);

            doEnd(res);
        });

        it('should 404 for unknown file', async function () {
            const res = await request.get('/content/images/some/file/that/doesnt-exist.jpg')
                .expect('Cache-Control', testUtils.cacheRules.private)
                .expect(404)
                .expect(/404 Image not found/);

            doEnd(res);
        });
    });

    describe('Main Routes', function () {
        it('/ should respond with valid HTML', async function () {
            const res = await request.get('/')
                .expect('Content-Type', /html/)
                .expect('Cache-Control', testUtils.cacheRules.public)
                .expect(200);

            const $ = cheerio.load(res.text);

            // NOTE: "Ghost" is the title from the settings.
            $('title').text().should.equal('Ghost');

            $('body.home-template').length.should.equal(1);
            $('article.post').length.should.equal(7);
            $('article.tag-getting-started').length.should.equal(7);

            doEnd(res);
        });

        it('/author/ghost/ should respond with valid HTML', async function () {
            const res = await request.get('/author/ghost/')
                .expect('Content-Type', /html/)
                .expect('Cache-Control', testUtils.cacheRules.public)
                .expect(200);

            const $ = cheerio.load(res.text);

            // NOTE: "Ghost" is the title from the settings.
            $('title').text().should.equal('Ghost - Ghost');

            $('body.author-template').length.should.equal(1);
            $('article.post').length.should.equal(7);
            $('article.tag-getting-started').length.should.equal(7);

            doEnd(res);
        });

        it('/tag/getting-started/ should respond with valid HTML', async function () {
            const res = await request.get('/tag/getting-started/')
                .expect('Content-Type', /html/)
                .expect('Cache-Control', testUtils.cacheRules.public)
                .expect(200);

            const $ = cheerio.load(res.text);

            // NOTE: "Ghost" is the title from the settings.
            $('title').text().should.equal('Getting Started - Ghost');

            $('body.tag-template').length.should.equal(1);
            $('article.post').length.should.equal(7);
            $('article.tag-getting-started').length.should.equal(7);

            doEnd(res);
        });
    });

    describe('Single post', function () {
        it('/welcome/ should respond with valid HTML', async function () {
            const res = await request.get('/welcome/')
                .expect('Content-Type', /html/)
                .expect('Cache-Control', testUtils.cacheRules.public)
                .expect(200);

            const $ = cheerio.load(res.text);

            // NOTE: This is the title from the settings.
            $('title').text().should.equal('Start here for a quick overview of everything you need to know');

            $('body.post-template').length.should.equal(1);
            $('body.tag-getting-started').length.should.equal(1);
            $('article.post').length.should.equal(2);
            $('article.tag-getting-started').length.should.equal(2);

            doEnd(res);
        });

        it('should not work with date permalinks', async function () {
            // get today's date
            const date = moment().format('YYYY/MM/DD');

            const res = await request.get('/' + date + '/welcome/')
                .expect('Cache-Control', testUtils.cacheRules.private)
                .expect(404)
                .expect(/Page not found/);

            doEnd(res);
        });
    });

    describe('Post edit', function () {
        it('should redirect to editor', async function () {
            const res = await request.get('/welcome/edit/')
                .expect('Location', /ghost\/#\/editor\/\w+/)
                .expect('Cache-Control', testUtils.cacheRules.public)
                .expect(302);

            doEnd(res);
        });

        it('should 404 for non-edit parameter', async function () {
            const res = await request.get('/welcome/notedit/')
                .expect('Cache-Control', testUtils.cacheRules.private)
                .expect(404)
                .expect(/Page not found/);

            doEnd(res);
        });

        describe('Admin Redirects Disabled', function () {
            before(async function () {
                configUtils.set('admin:redirects', false);

                await testUtils.startGhost({forceStart: true});
                request = supertest.agent(config.get('url'));
            });

            after(async function () {
                configUtils.restore();

                await testUtils.startGhost({forceStart: true});
                request = supertest.agent(config.get('url'));
            });

            it('/edit/ should NOT redirect to the editor', async function () {
                const res = await request.get('/welcome/edit/')
                    .expect('Cache-Control', testUtils.cacheRules.private)
                    .expect(404);

                doEnd(res);
            });
        });
    });

    describe('AMP post', function () {
        it('should respond with html for valid url', async function () {
            const res = await request.get('/welcome/amp/')
                .expect('Content-Type', /html/)
                .expect('Cache-Control', testUtils.cacheRules.public)
                .expect(200);

            const $ = cheerio.load(res.text);

            $('.post-title').text().should.equal('Start here for a quick overview of everything you need to know');

            $('.content .post').length.should.equal(1);
            $('.powered').text().should.equal(' Published with Ghost');
            $('body.amp-template').length.should.equal(1);
            $('article.post').length.should.equal(1);

            doEnd(res);
        });

        it('should not work with date permalinks', async function () {
            // get today's date
            const date = moment().format('YYYY/MM/DD');

            const res = await request.get('/' + date + '/welcome/amp/')
                .expect('Cache-Control', testUtils.cacheRules.private)
                .expect(404)
                .expect(/Page not found/);

            doEnd(res);
        });

        describe('AMP Disabled', function () {
            it('/amp/ should redirect to regular post, including any query params', async function () {
                sinon.stub(settingsCache, 'get').callsFake(function (key, options) {
                    if (key === 'amp' && !options) {
                        return false;
                    }
                    return origCache.get(key, options);
                });

                const res = await request.get('/welcome/amp/?q=a')
                    .expect('Location', '/welcome/?q=a')
                    .expect(301);

                doEnd(res);
            });
        });
    });

    describe('RSS', function () {
        it('/rss/ should serve an RSS feed', async function () {
            const res = await request.get('/rss/')
                .expect(200)
                .expect('Cache-Control', testUtils.cacheRules.public)
                .expect('Content-Type', 'text/xml; charset=utf-8');

            res.text.should.match(/<!\[CDATA\[Start here for a quick overview of everything you need to know\]\]>/);
            doEnd(res);
        });

        it('/author/ghost/rss/ should serve an RSS feed', async function () {
            const res = await request.get('/author/ghost/rss/')
                .expect(200)
                .expect('Cache-Control', testUtils.cacheRules.public)
                .expect('Content-Type', 'text/xml; charset=utf-8');

            res.text.should.match(/<!\[CDATA\[Start here for a quick overview of everything you need to know\]\]>/);
            doEnd(res);
        });

        it('/tag/getting-started/rss/ should serve an RSS feed', async function () {
            const res = await request.get('/tag/getting-started/rss/')
                .expect(200)
                .expect('Cache-Control', testUtils.cacheRules.public)
                .expect('Content-Type', 'text/xml; charset=utf-8');

            res.text.should.match(/<!\[CDATA\[Start here for a quick overview of everything you need to know\]\]>/);
            doEnd(res);
        });
    });

    describe('Static assets', function () {
        it('should retrieve theme assets', async function () {
            const res = await request.get('/assets/css/screen.css')
                .expect('Cache-Control', testUtils.cacheRules.year)
                .expect(200);

            doEnd(res);
        });

        it('should retrieve default robots.txt', async function () {
            const res = await request.get('/robots.txt')
                .expect('Cache-Control', testUtils.cacheRules.hour)
                .expect('ETag', /[0-9a-f]{32}/i)
                .expect(200);

            doEnd(res);
        });

        it('should retrieve default favicon.ico', async function () {
            const res = await request.get('/favicon.ico')
                .expect('Cache-Control', testUtils.cacheRules.day)
                .expect('ETag', /[0-9a-f]{32}/i)
                .expect(200);

            doEnd(res);
        });
    });

    describe('Site Map', function () {
        before(async function () {
            await testUtils.clearData();
            await testUtils.initData();
        });

        it('should serve sitemap.xml', async function () {
            const res = await request.get('/sitemap.xml')
                .expect(200)
                .expect('Cache-Control', testUtils.cacheRules.hour)
                .expect('Content-Type', 'text/xml; charset=utf-8');

            res.text.should.match(/sitemapindex/);
            doEnd(res);
        });

        it('should serve sitemap-posts.xml', async function () {
            const res = await request.get('/sitemap-posts.xml')
                .expect(200)
                .expect('Cache-Control', testUtils.cacheRules.hour)
                .expect('Content-Type', 'text/xml; charset=utf-8');

            res.text.should.match(/urlset/);
            doEnd(res);
        });

        it('should serve sitemap-pages.xml', async function () {
            const res = await request.get('/sitemap-pages.xml')
                .expect(200)
                .expect('Cache-Control', testUtils.cacheRules.hour)
                .expect('Content-Type', 'text/xml; charset=utf-8');

            res.text.should.match(/urlset/);
            doEnd(res);
        });

        it('should serve sitemap-tags.xml', async function () {
            const res = await request.get('/sitemap-tags.xml')
                .expect(200)
                .expect('Cache-Control', testUtils.cacheRules.hour)
                .expect('Content-Type', 'text/xml; charset=utf-8');

            res.text.should.match(/urlset/);
            doEnd(res);
        });

        it('should serve sitemap-users.xml', async function () {
            const res = await request.get('/sitemap-users.xml')
                .expect(200)
                .expect('Cache-Control', testUtils.cacheRules.hour)
                .expect('Content-Type', 'text/xml; charset=utf-8');

            res.text.should.match(/urlset/);
            doEnd(res);
        });

        it('should serve sitemap.xsl', async function () {
            const res = await request.get('/sitemap.xsl')
                .expect(200)
                .expect('Cache-Control', testUtils.cacheRules.day)
                .expect('Content-Type', 'text/xsl');

            res.text.should.match(/urlset/);
            doEnd(res);
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
            const res = await request.get('/')
                .expect('Location', '/private/?r=%2F')
                .expect(302);

            doEnd(res);
        });

        it('/welcome/ should redirect to /private/', async function () {
            const res = await request.get('/welcome/')
                .expect('Location', '/private/?r=%2Fwelcome%2F')
                .expect(302);

            doEnd(res);
        });

        it('/private/?r=%2Fwelcome%2F should not redirect', async function () {
            const res = await request.get('/private/?r=%2Fwelcome%2F')
                .expect(200);

            doEnd(res);
        });

        it('should redirect, NOT 404 for private route with extra path', async function () {
            const res = await request.get('/private/welcome/')
                .expect('Location', '/private/?r=%2Fprivate%2Fwelcome%2F')
                .expect(302);

            doEnd(res);
        });

        it('should still serve private RSS feed', async function () {
            const res = await request.get(`/${settingsCache.get('public_hash')}/rss/`)
                .expect(200)
                .expect('Cache-Control', testUtils.cacheRules.private)
                .expect('Content-Type', 'text/xml; charset=utf-8');

            res.text.should.match(/<!\[CDATA\[Start here for a quick overview of everything you need to know\]\]>/);
            doEnd(res);
        });

        it('should still serve private tag RSS feed', async function () {
            const res = await request.get(`/tag/getting-started/${settingsCache.get('public_hash')}/rss/`)
                .expect(200)
                .expect('Cache-Control', testUtils.cacheRules.private)
                .expect('Content-Type', 'text/xml; charset=utf-8');

            res.text.should.match(/<!\[CDATA\[Start here for a quick overview of everything you need to know\]\]>/);
            doEnd(res);
        });

        it('should redirect, NOT 404 for private tag RSS feed with extra path', async function () {
            const res = await request.get(`/tag/getting-started/${settingsCache.get('public_hash')}/rss/hack/`)
                .expect('Location', `/private/?r=%2Ftag%2Fgetting-started%2F${settingsCache.get('public_hash')}%2Frss%2Fhack%2F`)
                .expect(302);

            doEnd(res);
        });

        // NOTE: this case is covered by extra error handling, and cannot be unit tested
        it('should redirect, NOT 404 for unknown private RSS feed', async function () {
            // NOTE: the redirect will be to /hack/rss because we strip the hash from the URL before trying to serve RSS
            // This isn't ideal, but it's better to expose this internal logic than it is a 404 page
            const res = await request.get(`/hack/${settingsCache.get('public_hash')}/rss/`)
                .expect('Location', '/private/?r=%2Fhack%2Frss%2F')
                .expect(302);

            doEnd(res);
        });

        // NOTE: this test extends the unit test, checking that there is no other robots.txt middleware overriding private blogging
        it('should serve private robots.txt', async function () {
            const res = await request.get('/robots.txt')
                .expect('Cache-Control', 'public, max-age=3600000')
                .expect(200);

            res.text.should.match('User-agent: *\nDisallow: /');
            doEnd(res);
        });
    });
});
