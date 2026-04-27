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

    it('should skip for .hbs file', async function () {
        await new Promise((resolve, reject) => {
            const done = err => (err ? reject(err) : resolve());
            req.path = 'mytemplate.hbs';

            staticTheme()(req, res, function next() {
                sinon.assert.notCalled(activeThemeStub);
                sinon.assert.notCalled(expressStaticStub);

                done();
            });
        });
    });

    it('should skip for .md file', async function () {
        await new Promise((resolve, reject) => {
            const done = err => (err ? reject(err) : resolve());
            req.path = 'README.md';

            staticTheme()(req, res, function next() {
                sinon.assert.notCalled(activeThemeStub);
                sinon.assert.notCalled(expressStaticStub);

                done();
            });
        });
    });

    it('should skip for .json file', async function () {
        await new Promise((resolve, reject) => {
            const done = err => (err ? reject(err) : resolve());
            req.path = 'sample.json';

            staticTheme()(req, res, function next() {
                sinon.assert.notCalled(activeThemeStub);
                sinon.assert.notCalled(expressStaticStub);

                done();
            });
        });
    });

    it('should skip for .lock file', async function () {
        await new Promise((resolve, reject) => {
            const done = err => (err ? reject(err) : resolve());
            req.path = 'yarn.lock';

            staticTheme()(req, res, function next() {
                sinon.assert.notCalled(activeThemeStub);
                sinon.assert.notCalled(expressStaticStub);

                done();
            });
        });
    });

    it('should skip for gulp file', async function () {
        await new Promise((resolve, reject) => {
            const done = err => (err ? reject(err) : resolve());
            req.path = 'gulpfile.js';

            staticTheme()(req, res, function next() {
                sinon.assert.notCalled(activeThemeStub);
                sinon.assert.notCalled(expressStaticStub);

                done();
            });
        });
    });

    it('should skip for Grunt file', async function () {
        await new Promise((resolve, reject) => {
            const done = err => (err ? reject(err) : resolve());
            req.path = 'Gulpfile.js';

            staticTheme()(req, res, function next() {
                sinon.assert.notCalled(activeThemeStub);
                sinon.assert.notCalled(expressStaticStub);

                done();
            });
        });
    });

    it('should call express.static for .css file', async function () {
        await new Promise((resolve, reject) => {
            const done = err => (err ? reject(err) : resolve());
            req.path = 'myvalidfile.css';

            staticTheme()(req, res, function next() {
                // Specifically gets called twice
                sinon.assert.calledTwice(activeThemeStub);
                sinon.assert.called(expressStaticStub);

                // Check that express static gets called with the theme path + maxAge
                assertExists(expressStaticStub.firstCall.args);
                assert.equal(expressStaticStub.firstCall.args[0], 'my/fake/path');
                const options = expressStaticStub.firstCall.args[1];
                assert(options && typeof options === 'object');
                assert('maxAge' in options);

                done();
            });
        });
    });

    it('should call express.static for .js file', async function () {
        await new Promise((resolve, reject) => {
            const done = err => (err ? reject(err) : resolve());
            req.path = 'myvalidfile.js';

            staticTheme()(req, res, function next() {
                // Specifically gets called twice
                sinon.assert.calledTwice(activeThemeStub);
                sinon.assert.called(expressStaticStub);

                // Check that express static gets called with the theme path + maxAge
                assertExists(expressStaticStub.firstCall.args);
                assert.equal(expressStaticStub.firstCall.args[0], 'my/fake/path');
                const options = expressStaticStub.firstCall.args[1];
                assert(options && typeof options === 'object');
                assert('maxAge' in options);

                done();
            });
        });
    });

    it('should not error if active theme is missing', async function () {
        await new Promise((resolve, reject) => {
            const done = err => (err ? reject(err) : resolve());
            req.path = 'myvalidfile.css';

            // make the active theme not exist
            activeThemeStub.returns(undefined);

            staticTheme()(req, res, function next() {
                sinon.assert.calledOnce(activeThemeStub);
                sinon.assert.notCalled(expressStaticStub);

                done();
            });
        });
    });

    it('should NOT skip if file is allowed', async function () {
        await new Promise((resolve, reject) => {
            const done = err => (err ? reject(err) : resolve());
            req.path = 'manifest.json';

            staticTheme()(req, res, function next() {
                // Specifically gets called twice
                sinon.assert.calledTwice(activeThemeStub);
                sinon.assert.called(expressStaticStub);

                // Check that express static gets called with the theme path + maxAge
                assertExists(expressStaticStub.firstCall.args);
                assert.equal(expressStaticStub.firstCall.args[0], 'my/fake/path');
                const options = expressStaticStub.firstCall.args[1];
                assert(options && typeof options === 'object');
                assert('maxAge' in options);

                done();
            });
        });
    });

    it('should NOT skip if file is allowed even if nested', async function () {
        await new Promise((resolve, reject) => {
            const done = err => (err ? reject(err) : resolve());
            req.path = '/.well-known/assetlinks.json';

            staticTheme()(req, res, function next() {
                // Specifically gets called twice
                sinon.assert.calledTwice(activeThemeStub);
                sinon.assert.called(expressStaticStub);

                // Check that express static gets called with the theme path + maxAge
                assertExists(expressStaticStub.firstCall.args);
                assert.equal(expressStaticStub.firstCall.args[0], 'my/fake/path');
                const options = expressStaticStub.firstCall.args[1];
                assert(options && typeof options === 'object');
                assert('maxAge' in options);

                done();
            });
        });
    });

    it('should NOT skip if file is in assets', async function () {
        await new Promise((resolve, reject) => {
            const done = err => (err ? reject(err) : resolve());
            req.path = '/assets/whatever.json';

            staticTheme()(req, res, function next() {
                // Specifically gets called twice
                sinon.assert.calledTwice(activeThemeStub);
                sinon.assert.called(expressStaticStub);

                // Check that express static gets called with the theme path + maxAge
                assertExists(expressStaticStub.firstCall.args);
                assert.equal(expressStaticStub.firstCall.args[0], 'my/fake/path');
                const options = expressStaticStub.firstCall.args[1];
                assert(options && typeof options === 'object');
                assert('maxAge' in options);

                done();
            });
        });
    });

    it('should skip for .hbs file EVEN in /assets', async function () {
        await new Promise((resolve, reject) => {
            const done = err => (err ? reject(err) : resolve());
            req.path = '/assets/mytemplate.hbs';

            staticTheme()(req, res, function next() {
                sinon.assert.notCalled(activeThemeStub);
                sinon.assert.notCalled(expressStaticStub);

                done();
            });
        });
    });

    it('should disallow path traversal', async function () {
        await new Promise((resolve, reject) => {
            const done = err => (err ? reject(err) : resolve());
            req.path = '/assets/built%2F..%2F..%2F/package.json';
            req.method = 'GET';

            staticTheme()(req, res, function next() {
                sinon.assert.notCalled(activeThemeStub);
                sinon.assert.notCalled(expressStaticStub);

                done();
            });
        });
    });

    it('should not crash when malformatted URL sequence is passed', async function () {
        await new Promise((resolve, reject) => {
            const done = err => (err ? reject(err) : resolve());
            req.path = '/assets/built%2F..%2F..%2F%E0%A4%A/package.json';
            req.method = 'GET';

            staticTheme()(req, res, function next() {
                sinon.assert.notCalled(activeThemeStub);
                sinon.assert.notCalled(expressStaticStub);

                done();
            });
        });
    });

    describe('URL-encoded extension bypass prevention', function () {
        it('should skip for URL-encoded .hbs extension (h%62s)', async function () {
            await new Promise((resolve, reject) => {
                const done = err => (err ? reject(err) : resolve());
                req.path = 'mytemplate.h%62s';

                staticTheme()(req, res, function next() {
                    sinon.assert.notCalled(activeThemeStub);
                    sinon.assert.notCalled(expressStaticStub);

                    done();
                });
            });
        });

        it('should skip for URL-encoded .json extension (%6Ason)', async function () {
            await new Promise((resolve, reject) => {
                const done = err => (err ? reject(err) : resolve());
                req.path = 'package.%6Ason';

                staticTheme()(req, res, function next() {
                    sinon.assert.notCalled(activeThemeStub);
                    sinon.assert.notCalled(expressStaticStub);

                    done();
                });
            });
        });

        it('should skip for URL-encoded .md extension (%6Dd)', async function () {
            await new Promise((resolve, reject) => {
                const done = err => (err ? reject(err) : resolve());
                req.path = 'README.%6Dd';

                staticTheme()(req, res, function next() {
                    sinon.assert.notCalled(activeThemeStub);
                    sinon.assert.notCalled(expressStaticStub);

                    done();
                });
            });
        });

        it('should skip for URL-encoded .lock extension (l%6Fck)', async function () {
            await new Promise((resolve, reject) => {
                const done = err => (err ? reject(err) : resolve());
                req.path = 'yarn.l%6Fck';

                staticTheme()(req, res, function next() {
                    sinon.assert.notCalled(activeThemeStub);
                    sinon.assert.notCalled(expressStaticStub);

                    done();
                });
            });
        });

        it('should skip for URL-encoded .log extension (%6Cog)', async function () {
            await new Promise((resolve, reject) => {
                const done = err => (err ? reject(err) : resolve());
                req.path = 'ghost.%6Cog';

                staticTheme()(req, res, function next() {
                    sinon.assert.notCalled(activeThemeStub);
                    sinon.assert.notCalled(expressStaticStub);

                    done();
                });
            });
        });

        it('should skip for URL-encoded gulpfile.js (g%75lpfile.js)', async function () {
            await new Promise((resolve, reject) => {
                const done = err => (err ? reject(err) : resolve());
                req.path = 'g%75lpfile.js';

                staticTheme()(req, res, function next() {
                    sinon.assert.notCalled(activeThemeStub);
                    sinon.assert.notCalled(expressStaticStub);

                    done();
                });
            });
        });

        it('should skip for URL-encoded .hbs in /assets/ path', async function () {
            await new Promise((resolve, reject) => {
                const done = err => (err ? reject(err) : resolve());
                req.path = '/assets/mytemplate.h%62s';

                staticTheme()(req, res, function next() {
                    sinon.assert.notCalled(activeThemeStub);
                    sinon.assert.notCalled(expressStaticStub);

                    done();
                });
            });
        });

        it('should skip for malformed URL encoding in denied file', async function () {
            await new Promise((resolve, reject) => {
                const done = err => (err ? reject(err) : resolve());
                req.path = 'mytemplate.h%ZZs';

                staticTheme()(req, res, function next() {
                    sinon.assert.notCalled(activeThemeStub);
                    sinon.assert.notCalled(expressStaticStub);

                    done();
                });
            });
        });
    });

    describe('paths without file extensions', function () {
        it('should skip for root path /', async function () {
            await new Promise((resolve, reject) => {
                const done = err => (err ? reject(err) : resolve());
                req.path = '/';

                staticTheme()(req, res, function next() {
                    sinon.assert.notCalled(activeThemeStub);
                    sinon.assert.notCalled(expressStaticStub);

                    done();
                });
            });
        });

        it('should skip for /about/', async function () {
            await new Promise((resolve, reject) => {
                const done = err => (err ? reject(err) : resolve());
                req.path = '/about/';

                staticTheme()(req, res, function next() {
                    sinon.assert.notCalled(activeThemeStub);
                    sinon.assert.notCalled(expressStaticStub);

                    done();
                });
            });
        });

        it('should skip for /blog/my-post/', async function () {
            await new Promise((resolve, reject) => {
                const done = err => (err ? reject(err) : resolve());
                req.path = '/blog/my-post/';

                staticTheme()(req, res, function next() {
                    sinon.assert.notCalled(activeThemeStub);
                    sinon.assert.notCalled(expressStaticStub);

                    done();
                });
            });
        });

        it('should skip for path without trailing slash /contact', async function () {
            await new Promise((resolve, reject) => {
                const done = err => (err ? reject(err) : resolve());
                req.path = '/contact';

                staticTheme()(req, res, function next() {
                    sinon.assert.notCalled(activeThemeStub);
                    sinon.assert.notCalled(expressStaticStub);

                    done();
                });
            });
        });

        it('should NOT skip for file with extension without trailing slash', async function () {
            await new Promise((resolve, reject) => {
                const done = err => (err ? reject(err) : resolve());
                req.path = '/somefile.txt';

                staticTheme()(req, res, function next() {
                    // Specifically gets called twice
                    sinon.assert.calledTwice(activeThemeStub);
                    sinon.assert.called(expressStaticStub);

                    // Check that express static gets called with the theme path + maxAge
                    assertExists(expressStaticStub.firstCall.args);
                    assert.equal(expressStaticStub.firstCall.args[0], 'my/fake/path');
                    const options = expressStaticStub.firstCall.args[1];
                    assert(options && typeof options === 'object');
                    assert('maxAge' in options);

                    done();
                });
            });
        });

        it('should NOT skip for file with extension with trailing slash', async function () {
            await new Promise((resolve, reject) => {
                const done = err => (err ? reject(err) : resolve());
                req.path = '/somefile.txt/';

                staticTheme()(req, res, function next() {
                    // Specifically gets called twice
                    sinon.assert.calledTwice(activeThemeStub);
                    sinon.assert.called(expressStaticStub);

                    // Check that express static gets called with the theme path + maxAge
                    assertExists(expressStaticStub.firstCall.args);
                    assert.equal(expressStaticStub.firstCall.args[0], 'my/fake/path');
                    const options = expressStaticStub.firstCall.args[1];
                    assert(options && typeof options === 'object');
                    assert('maxAge' in options);

                    done();
                });
            });
        });

        it('should NOT skip for deeply nested file with extension', async function () {
            await new Promise((resolve, reject) => {
                const done = err => (err ? reject(err) : resolve());
                req.path = '/deep/nested/path/file.css';

                staticTheme()(req, res, function next() {
                    // Specifically gets called twice
                    sinon.assert.calledTwice(activeThemeStub);
                    sinon.assert.called(expressStaticStub);

                    // Check that express static gets called with the theme path + maxAge
                    assertExists(expressStaticStub.firstCall.args);
                    assert.equal(expressStaticStub.firstCall.args[0], 'my/fake/path');
                    const options = expressStaticStub.firstCall.args[1];
                    assert(options && typeof options === 'object');
                    assert('maxAge' in options);

                    done();
                });
            });
        });
    });

    describe('apple-app-site-association handling', function () {
        beforeEach(function () {
            activeThemeStub.returns({
                path: 'my/fake/path'
            });
        });

        it('should serve .well-known/apple-app-site-association despite missing extension', async function () {
            await new Promise((resolve, reject) => {
                const done = err => (err ? reject(err) : resolve());
                req.path = '/.well-known/apple-app-site-association';

                staticTheme()(req, res, function next() {
                    sinon.assert.called(activeThemeStub);
                    sinon.assert.called(expressStaticStub);

                    const options = expressStaticStub.firstCall.args[1];
                    assertExists(options.setHeaders);

                    const setHeaderStub = sinon.stub();
                    options.setHeaders({setHeader: setHeaderStub});
                    sinon.assert.calledWith(setHeaderStub, 'Content-Type', 'application/json');

                    done();
                });
            });
        });

        it('should fall through when request differs from exact path', async function () {
            await new Promise((resolve, reject) => {
                const done = err => (err ? reject(err) : resolve());
                req.path = '/.WELL-KNOWN/apple-app-site-association.json';

                staticTheme()(req, res, function next() {
                    sinon.assert.notCalled(expressStaticStub);
                    done();
                });
            });
        });
    });

    describe('fallthrough behavior', function () {
        it('should set fallthrough to true for /robots.txt', async function () {
            await new Promise((resolve, reject) => {
                const done = err => (err ? reject(err) : resolve());
                req.path = '/robots.txt';

                staticTheme()(req, res, function next() {
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

                    done();
                });
            });
        });

        it('should set fallthrough to true for /sitemap.xml', async function () {
            await new Promise((resolve, reject) => {
                const done = err => (err ? reject(err) : resolve());
                req.path = '/sitemap.xml';

                staticTheme()(req, res, function next() {
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

                    done();
                });
            });
        });

        it('should set fallthrough to true for /sitemap-posts.xml', async function () {
            await new Promise((resolve, reject) => {
                const done = err => (err ? reject(err) : resolve());
                req.path = '/sitemap-posts.xml';

                staticTheme()(req, res, function next() {
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

                    done();
                });
            });
        });

        it('should set fallthrough to true for paginated sitemaps like /sitemap-posts-2.xml', async function () {
            await new Promise((resolve, reject) => {
                const done = err => (err ? reject(err) : resolve());
                req.path = '/sitemap-posts-2.xml';

                staticTheme()(req, res, function next() {
                    sinon.assert.calledTwice(activeThemeStub);
                    sinon.assert.called(expressStaticStub);

                    assertExists(expressStaticStub.firstCall.args);
                    assert.equal(expressStaticStub.firstCall.args[0], 'my/fake/path');

                    const options = expressStaticStub.firstCall.args[1];
                    assert(_.isPlainObject(options));
                    assert('maxAge' in options);
                    assert.equal(options.fallthrough, true);

                    done();
                });
            });
        });

        it('should set fallthrough to true for higher page numbers like /sitemap-posts-99.xml', async function () {
            await new Promise((resolve, reject) => {
                const done = err => (err ? reject(err) : resolve());
                req.path = '/sitemap-posts-99.xml';

                staticTheme()(req, res, function next() {
                    sinon.assert.calledTwice(activeThemeStub);
                    sinon.assert.called(expressStaticStub);

                    const options = expressStaticStub.firstCall.args[1];
                    assert.equal(options.fallthrough, true);

                    done();
                });
            });
        });

        it('should set fallthrough to true for paginated tag sitemaps like /sitemap-tags-3.xml', async function () {
            await new Promise((resolve, reject) => {
                const done = err => (err ? reject(err) : resolve());
                req.path = '/sitemap-tags-3.xml';

                staticTheme()(req, res, function next() {
                    sinon.assert.calledTwice(activeThemeStub);
                    sinon.assert.called(expressStaticStub);

                    const options = expressStaticStub.firstCall.args[1];
                    assert.equal(options.fallthrough, true);

                    done();
                });
            });
        });

        it('should set fallthrough to true for paginated author sitemaps like /sitemap-authors-2.xml', async function () {
            await new Promise((resolve, reject) => {
                const done = err => (err ? reject(err) : resolve());
                req.path = '/sitemap-authors-2.xml';

                staticTheme()(req, res, function next() {
                    sinon.assert.calledTwice(activeThemeStub);
                    sinon.assert.called(expressStaticStub);

                    const options = expressStaticStub.firstCall.args[1];
                    assert.equal(options.fallthrough, true);

                    done();
                });
            });
        });

        it('should set fallthrough to false for other static files', async function () {
            await new Promise((resolve, reject) => {
                const done = err => (err ? reject(err) : resolve());
                req.path = '/style.css';

                staticTheme()(req, res, function next() {
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

                    done();
                });
            });
        });

        it('should set fallthrough to false for nested files', async function () {
            await new Promise((resolve, reject) => {
                const done = err => (err ? reject(err) : resolve());
                req.path = '/assets/style.css';

                staticTheme()(req, res, function next() {
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

                    done();
                });
            });
        });

        it('should set fallthrough to false for allowed special files like manifest.json', async function () {
            await new Promise((resolve, reject) => {
                const done = err => (err ? reject(err) : resolve());
                req.path = '/manifest.json';

                staticTheme()(req, res, function next() {
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

                    done();
                });
            });
        });
    });
});
