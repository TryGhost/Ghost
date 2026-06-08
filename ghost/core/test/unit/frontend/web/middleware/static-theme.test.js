const assert = require('node:assert/strict');
const {assertExists} = require('../../../../utils/assertions');
const sinon = require('sinon');
const _ = require('lodash');

const express = require('../../../../../core/shared/express');
const themeEngine = require('../../../../../core/frontend/services/theme-engine');
const staticTheme = require('../../../../../core/frontend/web/middleware/static-theme');

describe('staticTheme', function () {
    let expressStaticStub;
    let activeThemeStub;
    let req;
    let res;

    beforeEach(function () {
        req = {};
        res = {
            setHeader: sinon.stub()
        };

        activeThemeStub = sinon.stub(themeEngine, 'getActive').returns({
            path: 'my/fake/path'
        });

        expressStaticStub = sinon.stub(express, 'static').returns(function (_req, _res, _next) {
            _next();
        });
    });

    afterEach(function () {
        sinon.restore();
    });

    function callStaticTheme() {
        return new Promise((resolve, reject) => {
            staticTheme()(req, res, err => (err ? reject(err) : resolve()));
        });
    }

    it('should skip for .hbs file', async function () {
        req.path = 'mytemplate.hbs';

        await callStaticTheme();
        sinon.assert.notCalled(activeThemeStub);
        sinon.assert.notCalled(expressStaticStub);
    });

    it('should skip for .md file', async function () {
        req.path = 'README.md';

        await callStaticTheme();
        sinon.assert.notCalled(activeThemeStub);
        sinon.assert.notCalled(expressStaticStub);
    });

    it('should skip for .json file', async function () {
        req.path = 'sample.json';

        await callStaticTheme();
        sinon.assert.notCalled(activeThemeStub);
        sinon.assert.notCalled(expressStaticStub);
    });

    it('should skip for .lock file', async function () {
        req.path = 'yarn.lock';

        await callStaticTheme();
        sinon.assert.notCalled(activeThemeStub);
        sinon.assert.notCalled(expressStaticStub);
    });

    it('should skip for gulp file', async function () {
        req.path = 'gulpfile.js';

        await callStaticTheme();
        sinon.assert.notCalled(activeThemeStub);
        sinon.assert.notCalled(expressStaticStub);
    });

    it('should skip for Grunt file', async function () {
        req.path = 'Gulpfile.js';

        await callStaticTheme();
        sinon.assert.notCalled(activeThemeStub);
        sinon.assert.notCalled(expressStaticStub);
    });

    it('should call express.static for .css file', async function () {
        req.path = 'myvalidfile.css';

        await callStaticTheme();
        // Specifically gets called twice
        sinon.assert.calledTwice(activeThemeStub);
        sinon.assert.called(expressStaticStub);

        // Check that express static gets called with the theme path + maxAge
        assertExists(expressStaticStub.firstCall.args);
        assert.equal(expressStaticStub.firstCall.args[0], 'my/fake/path');
        const options = expressStaticStub.firstCall.args[1];
        assert(options && typeof options === 'object');
        assert('maxAge' in options);
    });

    it('should call express.static for .js file', async function () {
        req.path = 'myvalidfile.js';

        await callStaticTheme();
        // Specifically gets called twice
        sinon.assert.calledTwice(activeThemeStub);
        sinon.assert.called(expressStaticStub);

        // Check that express static gets called with the theme path + maxAge
        assertExists(expressStaticStub.firstCall.args);
        assert.equal(expressStaticStub.firstCall.args[0], 'my/fake/path');
        const options = expressStaticStub.firstCall.args[1];
        assert(options && typeof options === 'object');
        assert('maxAge' in options);
    });

    it('should not error if active theme is missing', async function () {
        req.path = 'myvalidfile.css';

        // make the active theme not exist
        activeThemeStub.returns(undefined);

        await callStaticTheme();
        sinon.assert.calledOnce(activeThemeStub);
        sinon.assert.notCalled(expressStaticStub);
    });

    it('should NOT skip if file is allowed', async function () {
        req.path = 'manifest.json';

        await callStaticTheme();
        // Specifically gets called twice
        sinon.assert.calledTwice(activeThemeStub);
        sinon.assert.called(expressStaticStub);

        // Check that express static gets called with the theme path + maxAge
        assertExists(expressStaticStub.firstCall.args);
        assert.equal(expressStaticStub.firstCall.args[0], 'my/fake/path');
        const options = expressStaticStub.firstCall.args[1];
        assert(options && typeof options === 'object');
        assert('maxAge' in options);
    });

    it('should NOT skip if file is allowed even if nested', async function () {
        req.path = '/.well-known/assetlinks.json';

        await callStaticTheme();
        // Specifically gets called twice
        sinon.assert.calledTwice(activeThemeStub);
        sinon.assert.called(expressStaticStub);

        // Check that express static gets called with the theme path + maxAge
        assertExists(expressStaticStub.firstCall.args);
        assert.equal(expressStaticStub.firstCall.args[0], 'my/fake/path');
        const options = expressStaticStub.firstCall.args[1];
        assert(options && typeof options === 'object');
        assert('maxAge' in options);
    });

    it('should NOT skip if file is in assets', async function () {
        req.path = '/assets/whatever.json';

        await callStaticTheme();
        // Specifically gets called twice
        sinon.assert.calledTwice(activeThemeStub);
        sinon.assert.called(expressStaticStub);

        // Check that express static gets called with the theme path + maxAge
        assertExists(expressStaticStub.firstCall.args);
        assert.equal(expressStaticStub.firstCall.args[0], 'my/fake/path');
        const options = expressStaticStub.firstCall.args[1];
        assert(options && typeof options === 'object');
        assert('maxAge' in options);
    });

    it('should skip for .hbs file EVEN in /assets', async function () {
        req.path = '/assets/mytemplate.hbs';

        await callStaticTheme();
        sinon.assert.notCalled(activeThemeStub);
        sinon.assert.notCalled(expressStaticStub);
    });

    it('should disallow path traversal', async function () {
        req.path = '/assets/built%2F..%2F..%2F/package.json';
        req.method = 'GET';

        await callStaticTheme();
        sinon.assert.notCalled(activeThemeStub);
        sinon.assert.notCalled(expressStaticStub);
    });

    it('should not crash when malformatted URL sequence is passed', async function () {
        req.path = '/assets/built%2F..%2F..%2F%E0%A4%A/package.json';
        req.method = 'GET';

        await callStaticTheme();
        sinon.assert.notCalled(activeThemeStub);
        sinon.assert.notCalled(expressStaticStub);
    });

    describe('URL-encoded extension bypass prevention', function () {
        it('should skip for URL-encoded .hbs extension (h%62s)', async function () {
            req.path = 'mytemplate.h%62s';

            await callStaticTheme();
            sinon.assert.notCalled(activeThemeStub);
            sinon.assert.notCalled(expressStaticStub);
        });

        it('should skip for URL-encoded .json extension (%6Ason)', async function () {
            req.path = 'package.%6Ason';

            await callStaticTheme();
            sinon.assert.notCalled(activeThemeStub);
            sinon.assert.notCalled(expressStaticStub);
        });

        it('should skip for URL-encoded .md extension (%6Dd)', async function () {
            req.path = 'README.%6Dd';

            await callStaticTheme();
            sinon.assert.notCalled(activeThemeStub);
            sinon.assert.notCalled(expressStaticStub);
        });

        it('should skip for URL-encoded .lock extension (l%6Fck)', async function () {
            req.path = 'yarn.l%6Fck';

            await callStaticTheme();
            sinon.assert.notCalled(activeThemeStub);
            sinon.assert.notCalled(expressStaticStub);
        });

        it('should skip for URL-encoded .log extension (%6Cog)', async function () {
            req.path = 'ghost.%6Cog';

            await callStaticTheme();
            sinon.assert.notCalled(activeThemeStub);
            sinon.assert.notCalled(expressStaticStub);
        });

        it('should skip for URL-encoded gulpfile.js (g%75lpfile.js)', async function () {
            req.path = 'g%75lpfile.js';

            await callStaticTheme();
            sinon.assert.notCalled(activeThemeStub);
            sinon.assert.notCalled(expressStaticStub);
        });

        it('should skip for URL-encoded .hbs in /assets/ path', async function () {
            req.path = '/assets/mytemplate.h%62s';

            await callStaticTheme();
            sinon.assert.notCalled(activeThemeStub);
            sinon.assert.notCalled(expressStaticStub);
        });

        it('should skip for malformed URL encoding in denied file', async function () {
            req.path = 'mytemplate.h%ZZs';

            await callStaticTheme();
            sinon.assert.notCalled(activeThemeStub);
            sinon.assert.notCalled(expressStaticStub);
        });
    });

    describe('paths without file extensions', function () {
        it('should skip for root path /', async function () {
            req.path = '/';

            await callStaticTheme();
            sinon.assert.notCalled(activeThemeStub);
            sinon.assert.notCalled(expressStaticStub);
        });

        it('should skip for /about/', async function () {
            req.path = '/about/';

            await callStaticTheme();
            sinon.assert.notCalled(activeThemeStub);
            sinon.assert.notCalled(expressStaticStub);
        });

        it('should skip for /blog/my-post/', async function () {
            req.path = '/blog/my-post/';

            await callStaticTheme();
            sinon.assert.notCalled(activeThemeStub);
            sinon.assert.notCalled(expressStaticStub);
        });

        it('should skip for path without trailing slash /contact', async function () {
            req.path = '/contact';

            await callStaticTheme();
            sinon.assert.notCalled(activeThemeStub);
            sinon.assert.notCalled(expressStaticStub);
        });

        it('should NOT skip for file with extension without trailing slash', async function () {
            req.path = '/somefile.txt';

            await callStaticTheme();
            // Specifically gets called twice
            sinon.assert.calledTwice(activeThemeStub);
            sinon.assert.called(expressStaticStub);

            // Check that express static gets called with the theme path + maxAge
            assertExists(expressStaticStub.firstCall.args);
            assert.equal(expressStaticStub.firstCall.args[0], 'my/fake/path');
            const options = expressStaticStub.firstCall.args[1];
            assert(options && typeof options === 'object');
            assert('maxAge' in options);
        });

        it('should NOT skip for file with extension with trailing slash', async function () {
            req.path = '/somefile.txt/';

            await callStaticTheme();
            // Specifically gets called twice
            sinon.assert.calledTwice(activeThemeStub);
            sinon.assert.called(expressStaticStub);

            // Check that express static gets called with the theme path + maxAge
            assertExists(expressStaticStub.firstCall.args);
            assert.equal(expressStaticStub.firstCall.args[0], 'my/fake/path');
            const options = expressStaticStub.firstCall.args[1];
            assert(options && typeof options === 'object');
            assert('maxAge' in options);
        });

        it('should NOT skip for deeply nested file with extension', async function () {
            req.path = '/deep/nested/path/file.css';

            await callStaticTheme();
            // Specifically gets called twice
            sinon.assert.calledTwice(activeThemeStub);
            sinon.assert.called(expressStaticStub);

            // Check that express static gets called with the theme path + maxAge
            assertExists(expressStaticStub.firstCall.args);
            assert.equal(expressStaticStub.firstCall.args[0], 'my/fake/path');
            const options = expressStaticStub.firstCall.args[1];
            assert(options && typeof options === 'object');
            assert('maxAge' in options);
        });
    });

    describe('apple-app-site-association handling', function () {
        beforeEach(function () {
            activeThemeStub.returns({
                path: 'my/fake/path'
            });
        });

        it('should serve .well-known/apple-app-site-association despite missing extension', async function () {
            req.path = '/.well-known/apple-app-site-association';

            await callStaticTheme();
            sinon.assert.called(activeThemeStub);
            sinon.assert.called(expressStaticStub);

            const options = expressStaticStub.firstCall.args[1];
            assertExists(options.setHeaders);

            const setHeaderStub = sinon.stub();
            options.setHeaders({setHeader: setHeaderStub});
            sinon.assert.calledWith(setHeaderStub, 'Content-Type', 'application/json');
        });

        it('should fall through when request differs from exact path', async function () {
            req.path = '/.WELL-KNOWN/apple-app-site-association.json';

            await callStaticTheme();
            sinon.assert.notCalled(expressStaticStub);
        });
    });

    describe('fallthrough behavior', function () {
        it('should set fallthrough to true for /robots.txt', async function () {
            req.path = '/robots.txt';

            await callStaticTheme();
            // Specifically gets called twice
            sinon.assert.calledTwice(activeThemeStub);
            sinon.assert.called(expressStaticStub);

            // Check that express static gets called with correct options
            assertExists(expressStaticStub.firstCall.args);
            assert.equal(expressStaticStub.firstCall.args[0], 'my/fake/path');

            const options = expressStaticStub.firstCall.args[1];
            assert(_.isPlainObject(options));
            assert('maxAge' in options);
            assert.equal(options.fallthrough, true);
        });

        it('should set fallthrough to true for /sitemap.xml', async function () {
            req.path = '/sitemap.xml';

            await callStaticTheme();
            // Specifically gets called twice
            sinon.assert.calledTwice(activeThemeStub);
            sinon.assert.called(expressStaticStub);

            // Check that express static gets called with correct options
            assertExists(expressStaticStub.firstCall.args);
            assert.equal(expressStaticStub.firstCall.args[0], 'my/fake/path');

            const options = expressStaticStub.firstCall.args[1];
            assert(_.isPlainObject(options));
            assert('maxAge' in options);
            assert.equal(options.fallthrough, true);
        });

        it('should set fallthrough to true for /sitemap-posts.xml', async function () {
            req.path = '/sitemap-posts.xml';

            await callStaticTheme();
            // Specifically gets called twice
            sinon.assert.calledTwice(activeThemeStub);
            sinon.assert.called(expressStaticStub);

            // Check that express static gets called with correct options
            assertExists(expressStaticStub.firstCall.args);
            assert.equal(expressStaticStub.firstCall.args[0], 'my/fake/path');

            const options = expressStaticStub.firstCall.args[1];
            assert(_.isPlainObject(options));
            assert('maxAge' in options);
            assert.equal(options.fallthrough, true);
        });

        it('should set fallthrough to true for paginated sitemaps like /sitemap-posts-2.xml', async function () {
            req.path = '/sitemap-posts-2.xml';

            await callStaticTheme();
            sinon.assert.calledTwice(activeThemeStub);
            sinon.assert.called(expressStaticStub);

            assertExists(expressStaticStub.firstCall.args);
            assert.equal(expressStaticStub.firstCall.args[0], 'my/fake/path');

            const options = expressStaticStub.firstCall.args[1];
            assert(_.isPlainObject(options));
            assert('maxAge' in options);
            assert.equal(options.fallthrough, true);
        });

        it('should set fallthrough to true for higher page numbers like /sitemap-posts-99.xml', async function () {
            req.path = '/sitemap-posts-99.xml';

            await callStaticTheme();
            sinon.assert.calledTwice(activeThemeStub);
            sinon.assert.called(expressStaticStub);

            const options = expressStaticStub.firstCall.args[1];
            assert.equal(options.fallthrough, true);
        });

        it('should set fallthrough to true for paginated tag sitemaps like /sitemap-tags-3.xml', async function () {
            req.path = '/sitemap-tags-3.xml';

            await callStaticTheme();
            sinon.assert.calledTwice(activeThemeStub);
            sinon.assert.called(expressStaticStub);

            const options = expressStaticStub.firstCall.args[1];
            assert.equal(options.fallthrough, true);
        });

        it('should set fallthrough to true for paginated author sitemaps like /sitemap-authors-2.xml', async function () {
            req.path = '/sitemap-authors-2.xml';

            await callStaticTheme();
            sinon.assert.calledTwice(activeThemeStub);
            sinon.assert.called(expressStaticStub);

            const options = expressStaticStub.firstCall.args[1];
            assert.equal(options.fallthrough, true);
        });

        it('should set fallthrough to false for other static files', async function () {
            req.path = '/style.css';

            await callStaticTheme();
            // Specifically gets called twice
            sinon.assert.calledTwice(activeThemeStub);
            sinon.assert.called(expressStaticStub);

            // Check that express static gets called with correct options
            assertExists(expressStaticStub.firstCall.args);
            assert.equal(expressStaticStub.firstCall.args[0], 'my/fake/path');

            const options = expressStaticStub.firstCall.args[1];
            assert(_.isPlainObject(options));
            assert('maxAge' in options);
            assert.equal(options.fallthrough, false);
        });

        it('should set fallthrough to false for nested files', async function () {
            req.path = '/assets/style.css';

            await callStaticTheme();
            // Specifically gets called twice
            sinon.assert.calledTwice(activeThemeStub);
            sinon.assert.called(expressStaticStub);

            // Check that express static gets called with correct options
            assertExists(expressStaticStub.firstCall.args);
            assert.equal(expressStaticStub.firstCall.args[0], 'my/fake/path');

            const options = expressStaticStub.firstCall.args[1];
            assert(_.isPlainObject(options));
            assert('maxAge' in options);
            assert.equal(options.fallthrough, false);
        });

        it('should set fallthrough to false for allowed special files like manifest.json', async function () {
            req.path = '/manifest.json';

            await callStaticTheme();
            // Specifically gets called twice
            sinon.assert.calledTwice(activeThemeStub);
            sinon.assert.called(expressStaticStub);

            // Check that express static gets called with correct options
            assertExists(expressStaticStub.firstCall.args);
            assert.equal(expressStaticStub.firstCall.args[0], 'my/fake/path');

            const options = expressStaticStub.firstCall.args[1];
            assert(_.isPlainObject(options));
            assert('maxAge' in options);
            assert.equal(options.fallthrough, false);
        });
    });
});
