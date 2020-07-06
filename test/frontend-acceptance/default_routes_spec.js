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
const ghost = testUtils.startGhost;

describe('Default Frontend routing', function () {
    let request;

    function doEnd(done) {
        return function (err, res) {
            if (err) {
                return done(err);
            }

            should.not.exist(res.headers['x-cache-invalidate']);
            should.not.exist(res.headers['X-CSRF-Token']);
            should.not.exist(res.headers['set-cookie']);
            should.exist(res.headers.date);

            done();
        };
    }

    afterEach(function () {
        sinon.restore();
    });

    before(function () {
        return ghost()
            .then(function () {
                request = supertest.agent(config.get('url'));
            });
    });

    describe('Error', function () {
        it('should 404 for unknown post', function (done) {
            request.get('/spectacular/')
                .expect('Cache-Control', testUtils.cacheRules.private)
                .expect(404)
                .expect(/Page not found/)
                .end(doEnd(done));
        });

        it('should 404 for unknown file', function (done) {
            request.get('/content/images/some/file/that/doesnt-exist.jpg')
                .expect('Cache-Control', testUtils.cacheRules.private)
                .expect(404)
                .expect(/404 Image not found/)
                .end(doEnd(done));
        });
    });

    describe('Main Routes', function () {
        it('/ should respond with valid HTML', function (done) {
            request.get('/')
                .expect('Content-Type', /html/)
                .expect('Cache-Control', testUtils.cacheRules.public)
                .expect(200)
                .end(function (err, res) {
                    const $ = cheerio.load(res.text);

                    // NOTE: "Ghost" is the title from the settings.
                    $('title').text().should.equal('Ghost');

                    $('body.home-template').length.should.equal(1);
                    $('article.post').length.should.equal(7);
                    $('article.tag-getting-started').length.should.equal(7);

                    doEnd(done)(err, res);
                });
        });

        it('/author/ghost/ should respond with valid HTML', function (done) {
            request.get('/author/ghost/')
                .expect('Content-Type', /html/)
                .expect('Cache-Control', testUtils.cacheRules.public)
                .expect(200)
                .end(function (err, res) {
                    const $ = cheerio.load(res.text);

                    // NOTE: "Ghost" is the title from the settings.
                    $('title').text().should.equal('Ghost - Ghost');

                    $('body.author-template').length.should.equal(1);
                    $('article.post').length.should.equal(7);
                    $('article.tag-getting-started').length.should.equal(7);

                    doEnd(done)(err, res);
                });
        });

        it('/tag/getting-started/ should respond with valid HTML', function (done) {
            request.get('/tag/getting-started/')
                .expect('Content-Type', /html/)
                .expect('Cache-Control', testUtils.cacheRules.public)
                .expect(200)
                .end(function (err, res) {
                    const $ = cheerio.load(res.text);

                    // NOTE: "Ghost" is the title from the settings.
                    $('title').text().should.equal('Getting Started - Ghost');

                    $('body.tag-template').length.should.equal(1);
                    $('article.post').length.should.equal(7);
                    $('article.tag-getting-started').length.should.equal(7);

                    doEnd(done)(err, res);
                });
        });
    });

    describe('Single post', function () {
        it('/welcome/ should respond with valid HTML', function (done) {
            request.get('/welcome/')
                .expect('Content-Type', /html/)
                .expect('Cache-Control', testUtils.cacheRules.public)
                .expect(200)
                .end(function (err, res) {
                    const $ = cheerio.load(res.text);

                    // NOTE: This is the title from the settings.
                    $('title').text().should.equal('Welcome to Ghost');

                    $('body.post-template').length.should.equal(1);
                    $('body.tag-getting-started').length.should.equal(1);
                    $('article.post').length.should.equal(2);
                    $('article.tag-getting-started').length.should.equal(2);

                    doEnd(done)(err, res);
                });
        });

        it('should not work with date permalinks', function (done) {
            // get today's date
            const date = moment().format('YYYY/MM/DD');

            request.get('/' + date + '/welcome/')
                .expect('Cache-Control', testUtils.cacheRules.private)
                .expect(404)
                .expect(/Page not found/)
                .end(doEnd(done));
        });
    });

    describe('Post edit', function () {
        it('should redirect to editor', function (done) {
            request.get('/welcome/edit/')
                .expect('Location', /ghost\/#\/editor\/\w+/)
                .expect('Cache-Control', testUtils.cacheRules.public)
                .expect(302)
                .end(doEnd(done));
        });

        it('should 404 for non-edit parameter', function (done) {
            request.get('/welcome/notedit/')
                .expect('Cache-Control', testUtils.cacheRules.private)
                .expect(404)
                .expect(/Page not found/)
                .end(doEnd(done));
        });

        describe('Admin Redirects Disabled', function () {
            before(function () {
                configUtils.set('admin:redirects', false);

                return ghost({forceStart: true})
                    .then(function () {
                        request = supertest.agent(config.get('url'));
                    });
            });

            after(function () {
                configUtils.restore();

                return ghost({forceStart: true})
                    .then(function () {
                        request = supertest.agent(config.get('url'));
                    });
            });

            it('/edit/ should NOT redirect to the editor', function (done) {
                request.get('/welcome/edit/')
                    .expect('Cache-Control', testUtils.cacheRules.private)
                    .expect(404)
                    .end(doEnd(done));
            });
        });
    });

    describe('AMP post', function () {
        it('should respond with html for valid url', function (done) {
            request.get('/welcome/amp/')
                .expect('Content-Type', /html/)
                .expect('Cache-Control', testUtils.cacheRules.public)
                .expect(200)
                .end(function (err, res) {
                    if (err) {
                        return done(err);
                    }

                    const $ = cheerio.load(res.text);

                    should.not.exist(res.headers['x-cache-invalidate']);
                    should.not.exist(res.headers['X-CSRF-Token']);
                    should.not.exist(res.headers['set-cookie']);
                    should.exist(res.headers.date);

                    $('.post-title').text().should.equal('Welcome to Ghost');

                    $('.content .post').length.should.equal(1);
                    $('.powered').text().should.equal(' Published with Ghost');
                    $('body.amp-template').length.should.equal(1);
                    $('article.post').length.should.equal(1);

                    done();
                });
        });

        it('should not work with date permalinks', function (done) {
            // get today's date
            const date = moment().format('YYYY/MM/DD');

            request.get('/' + date + '/welcome/amp/')
                .expect('Cache-Control', testUtils.cacheRules.private)
                .expect(404)
                .expect(/Page not found/)
                .end(doEnd(done));
        });

        describe('AMP Disabled', function () {
            it('/amp/ should redirect to regular post, including any query params', function (done) {
                sinon.stub(settingsCache, 'get').callsFake(function (key, options) {
                    if (key === 'amp' && !options) {
                        return false;
                    }
                    return origCache.get(key, options);
                });

                request.get('/welcome/amp/?q=a')
                    .expect('Location', '/welcome/?q=a')
                    .expect(301)
                    .end(doEnd(done));
            });
        });
    });

    describe('RSS', function () {
        it('/rss/ should serve an RSS feed', function (done) {
            request.get('/rss/')
                .expect(200)
                .expect('Cache-Control', testUtils.cacheRules.public)
                .expect('Content-Type', 'text/xml; charset=utf-8')
                .end(function (err, res) {
                    res.text.should.match(/<!\[CDATA\[Welcome to Ghost\]\]>/);
                    doEnd(done)(err, res);
                });
        });

        it('/author/ghost/rss/ should serve an RSS feed', function (done) {
            request.get('/author/ghost/rss/')
                .expect(200)
                .expect('Cache-Control', testUtils.cacheRules.public)
                .expect('Content-Type', 'text/xml; charset=utf-8')
                .end(function (err, res) {
                    res.text.should.match(/<!\[CDATA\[Welcome to Ghost\]\]>/);
                    doEnd(done)(err, res);
                });
        });

        it('/tag/getting-started/rss/ should serve an RSS feed', function (done) {
            request.get('/tag/getting-started/rss/')
                .expect(200)
                .expect('Cache-Control', testUtils.cacheRules.public)
                .expect('Content-Type', 'text/xml; charset=utf-8')
                .end(function (err, res) {
                    res.text.should.match(/<!\[CDATA\[Welcome to Ghost\]\]>/);
                    doEnd(done)(err, res);
                });
        });
    });

    describe('Static assets', function () {
        it('should retrieve theme assets', function (done) {
            request.get('/assets/css/screen.css')
                .expect('Cache-Control', testUtils.cacheRules.year)
                .expect(200)
                .end(doEnd(done));
        });

        it('should retrieve default robots.txt', function (done) {
            request.get('/robots.txt')
                .expect('Cache-Control', testUtils.cacheRules.hour)
                .expect('ETag', /[0-9a-f]{32}/i)
                .expect(200)
                .end(doEnd(done));
        });

        it('should retrieve default favicon.ico', function (done) {
            request.get('/favicon.ico')
                .expect('Cache-Control', testUtils.cacheRules.day)
                .expect('ETag', /[0-9a-f]{32}/i)
                .expect(200)
                .end(doEnd(done));
        });
    });

    describe('Site Map', function () {
        before(function (done) {
            testUtils.clearData().then(function () {
                return testUtils.initData();
            }).then(function () {
                done();
            }).catch(done);
        });

        it('should serve sitemap.xml', function (done) {
            request.get('/sitemap.xml')
                .expect(200)
                .expect('Cache-Control', testUtils.cacheRules.hour)
                .expect('Content-Type', 'text/xml; charset=utf-8')
                .end(function (err, res) {
                    res.text.should.match(/sitemapindex/);
                    doEnd(done)(err, res);
                });
        });

        it('should serve sitemap-posts.xml', function (done) {
            request.get('/sitemap-posts.xml')
                .expect(200)
                .expect('Cache-Control', testUtils.cacheRules.hour)
                .expect('Content-Type', 'text/xml; charset=utf-8')
                .end(function (err, res) {
                    res.text.should.match(/urlset/);
                    doEnd(done)(err, res);
                });
        });

        it('should serve sitemap-pages.xml', function (done) {
            request.get('/sitemap-pages.xml')
                .expect(200)
                .expect('Cache-Control', testUtils.cacheRules.hour)
                .expect('Content-Type', 'text/xml; charset=utf-8')
                .end(function (err, res) {
                    res.text.should.match(/urlset/);
                    doEnd(done)(err, res);
                });
        });

        it('should serve sitemap-tags.xml', function (done) {
            request.get('/sitemap-tags.xml')
                .expect(200)
                .expect('Cache-Control', testUtils.cacheRules.hour)
                .expect('Content-Type', 'text/xml; charset=utf-8')
                .end(function (err, res) {
                    res.text.should.match(/urlset/);
                    doEnd(done)(err, res);
                });
        });

        it('should serve sitemap-users.xml', function (done) {
            request.get('/sitemap-users.xml')
                .expect(200)
                .expect('Cache-Control', testUtils.cacheRules.hour)
                .expect('Content-Type', 'text/xml; charset=utf-8')
                .end(function (err, res) {
                    res.text.should.match(/urlset/);
                    doEnd(done)(err, res);
                });
        });

        it('should serve sitemap.xsl', function (done) {
            request.get('/sitemap.xsl')
                .expect(200)
                .expect('Cache-Control', testUtils.cacheRules.day)
                .expect('Content-Type', 'text/xsl')
                .end(function (err, res) {
                    res.text.should.match(/urlset/);
                    doEnd(done)(err, res);
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

        it('/ should redirect to /private/', function (done) {
            request.get('/')
                .expect('Location', '/private/?r=%2F')
                .expect(302)
                .end(doEnd(done));
        });

        it('/welcome/ should redirect to /private/', function (done) {
            request.get('/welcome/')
                .expect('Location', '/private/?r=%2Fwelcome%2F')
                .expect(302)
                .end(doEnd(done));
        });

        it('/private/?r=%2Fwelcome%2F should not redirect', function (done) {
            request.get('/private/?r=%2Fwelcome%2F')
                .expect(200)
                .end(doEnd(done));
        });

        it('should redirect, NOT 404 for private route with extra path', function (done) {
            request.get('/private/welcome/')
                .expect('Location', '/private/?r=%2Fprivate%2Fwelcome%2F')
                .expect(302)
                .end(doEnd(done));
        });

        it('should still serve private RSS feed', function (done) {
            request.get(`/${settingsCache.get('public_hash')}/rss/`)
                .expect(200)
                .expect('Cache-Control', testUtils.cacheRules.private)
                .expect('Content-Type', 'text/xml; charset=utf-8')
                .end(function (err, res) {
                    res.text.should.match(/<!\[CDATA\[Welcome to Ghost\]\]>/);
                    doEnd(done)(err, res);
                });
        });

        it('should still serve private tag RSS feed', function (done) {
            request.get(`/tag/getting-started/${settingsCache.get('public_hash')}/rss/`)
                .expect(200)
                .expect('Cache-Control', testUtils.cacheRules.private)
                .expect('Content-Type', 'text/xml; charset=utf-8')
                .end(function (err, res) {
                    res.text.should.match(/<!\[CDATA\[Welcome to Ghost\]\]>/);
                    doEnd(done)(err, res);
                });
        });

        it('should redirect, NOT 404 for private tag RSS feed with extra path', function (done) {
            request.get(`/tag/getting-started/${settingsCache.get('public_hash')}/rss/hack/`)
                .expect('Location', `/private/?r=%2Ftag%2Fgetting-started%2F${settingsCache.get('public_hash')}%2Frss%2Fhack%2F`)
                .expect(302)
                .end(doEnd(done));
        });

        // NOTE: this case is covered by extra error handling, and cannot be unit tested
        it('should redirect, NOT 404 for unknown private RSS feed', function (done) {
            // NOTE: the redirect will be to /hack/rss because we strip the hash from the URL before trying to serve RSS
            // This isn't ideal, but it's better to expose this internal logic than it is a 404 page
            request.get(`/hack/${settingsCache.get('public_hash')}/rss/`)
                .expect('Location', '/private/?r=%2Fhack%2Frss%2F')
                .expect(302)
                .end(doEnd(done));
        });

        // NOTE: this test extends the unit test, checking that there is no other robots.txt middleware overriding private blogging
        it('should serve private robots.txt', function (done) {
            request.get('/robots.txt')
                .expect('Cache-Control', 'public, max-age=3600000')
                .expect(200)
                .end(function (err, res) {
                    res.text.should.match('User-agent: *\nDisallow: /');
                    doEnd(done)(err, res);
                });
        });
    });
});
