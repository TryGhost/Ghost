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

    it('should skip for .hbs file', function (done) {
        req.path = 'mytemplate.hbs';

        staticTheme()(req, res, function next() {
            sinon.assert.notCalled(activeThemeStub);
            sinon.assert.notCalled(expressStaticStub);

            done();
        });
    });

    it('should skip for .md file', function (done) {
        req.path = 'README.md';

        staticTheme()(req, res, function next() {
            sinon.assert.notCalled(activeThemeStub);
            sinon.assert.notCalled(expressStaticStub);

            done();
        });
    });

    it('should skip for .json file', function (done) {
        req.path = 'sample.json';

        staticTheme()(req, res, function next() {
            sinon.assert.notCalled(activeThemeStub);
            sinon.assert.notCalled(expressStaticStub);

            done();
        });
    });

    it('should skip for .lock file', function (done) {
        req.path = 'yarn.lock';

        staticTheme()(req, res, function next() {
            sinon.assert.notCalled(activeThemeStub);
            sinon.assert.notCalled(expressStaticStub);

            done();
        });
    });

    it('should skip for gulp file', function (done) {
        req.path = 'gulpfile.js';

        staticTheme()(req, res, function next() {
            sinon.assert.notCalled(activeThemeStub);
            sinon.assert.notCalled(expressStaticStub);

            done();
        });
    });

    it('should skip for Grunt file', function (done) {
        req.path = 'Gulpfile.js';

        staticTheme()(req, res, function next() {
            sinon.assert.notCalled(activeThemeStub);
            sinon.assert.notCalled(expressStaticStub);

            done();
        });
    });

    it('should call express.static for .css file', function (done) {
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

    it('should call express.static for .js file', function (done) {
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

    it('should not error if active theme is missing', function (done) {
        req.path = 'myvalidfile.css';

        // make the active theme not exist
        activeThemeStub.returns(undefined);

        staticTheme()(req, res, function next() {
            sinon.assert.calledOnce(activeThemeStub);
            sinon.assert.notCalled(expressStaticStub);

            done();
        });
    });

    it('should NOT skip if file is allowed', function (done) {
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

    it('should NOT skip if file is allowed even if nested', function (done) {
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

    it('should NOT skip if file is in assets', function (done) {
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

    it('should skip for .hbs file EVEN in /assets', function (done) {
        req.path = '/assets/mytemplate.hbs';

        staticTheme()(req, res, function next() {
            sinon.assert.notCalled(activeThemeStub);
            sinon.assert.notCalled(expressStaticStub);

            done();
        });
    });

    it('should disallow path traversal', function (done) {
        req.path = '/assets/built%2F..%2F..%2F/package.json';
        req.method = 'GET';

        staticTheme()(req, res, function next() {
            sinon.assert.notCalled(activeThemeStub);
            sinon.assert.notCalled(expressStaticStub);

            done();
        });
    });

    it('should not crash when malformatted URL sequence is passed', function (done) {
        req.path = '/assets/built%2F..%2F..%2F%E0%A4%A/package.json';
        req.method = 'GET';

        staticTheme()(req, res, function next() {
            sinon.assert.notCalled(activeThemeStub);
            sinon.assert.notCalled(expressStaticStub);

            done();
        });
    });

    describe('paths without file extensions', function () {
        it('should skip for root path /', function (done) {
            req.path = '/';

            staticTheme()(req, res, function next() {
                sinon.assert.notCalled(activeThemeStub);
                sinon.assert.notCalled(expressStaticStub);

                done();
            });
        });

        it('should skip for /about/', function (done) {
            req.path = '/about/';

            staticTheme()(req, res, function next() {
                sinon.assert.notCalled(activeThemeStub);
                sinon.assert.notCalled(expressStaticStub);

                done();
            });
        });

        it('should skip for /blog/my-post/', function (done) {
            req.path = '/blog/my-post/';

            staticTheme()(req, res, function next() {
                sinon.assert.notCalled(activeThemeStub);
                sinon.assert.notCalled(expressStaticStub);

                done();
            });
        });

        it('should skip for path without trailing slash /contact', function (done) {
            req.path = '/contact';

            staticTheme()(req, res, function next() {
                sinon.assert.notCalled(activeThemeStub);
                sinon.assert.notCalled(expressStaticStub);

                done();
            });
        });

        it('should NOT skip for file with extension without trailing slash', function (done) {
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

        it('should NOT skip for file with extension with trailing slash', function (done) {
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

        it('should NOT skip for deeply nested file with extension', function (done) {
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

    describe('apple-app-site-association handling', function () {
        beforeEach(function () {
            activeThemeStub.returns({
                path: 'my/fake/path'
            });
        });

        it('should serve .well-known/apple-app-site-association despite missing extension', function (done) {
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

        it('should fall through when request differs from exact path', function (done) {
            req.path = '/.WELL-KNOWN/apple-app-site-association.json';

            staticTheme()(req, res, function next() {
                sinon.assert.notCalled(expressStaticStub);
                done();
            });
        });
    });

    describe('fallthrough behavior', function () {
        it('should set fallthrough to true for /robots.txt', function (done) {
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

        it('should set fallthrough to true for /sitemap.xml', function (done) {
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

        it('should set fallthrough to true for /sitemap-posts.xml', function (done) {
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

        it('should set fallthrough to true for paginated sitemaps like /sitemap-posts-2.xml', function (done) {
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

        it('should set fallthrough to true for higher page numbers like /sitemap-posts-99.xml', function (done) {
            req.path = '/sitemap-posts-99.xml';

            staticTheme()(req, res, function next() {
                sinon.assert.calledTwice(activeThemeStub);
                sinon.assert.called(expressStaticStub);

                const options = expressStaticStub.firstCall.args[1];
                assert.equal(options.fallthrough, true);

                done();
            });
        });

        it('should set fallthrough to true for paginated tag sitemaps like /sitemap-tags-3.xml', function (done) {
            req.path = '/sitemap-tags-3.xml';

            staticTheme()(req, res, function next() {
                sinon.assert.calledTwice(activeThemeStub);
                sinon.assert.called(expressStaticStub);

                const options = expressStaticStub.firstCall.args[1];
                assert.equal(options.fallthrough, true);

                done();
            });
        });

        it('should set fallthrough to true for paginated author sitemaps like /sitemap-authors-2.xml', function (done) {
            req.path = '/sitemap-authors-2.xml';

            staticTheme()(req, res, function next() {
                sinon.assert.calledTwice(activeThemeStub);
                sinon.assert.called(expressStaticStub);

                const options = expressStaticStub.firstCall.args[1];
                assert.equal(options.fallthrough, true);

                done();
            });
        });

        it('should set fallthrough to false for other static files', function (done) {
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

        it('should set fallthrough to false for nested files', function (done) {
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

        it('should set fallthrough to false for allowed special files like manifest.json', function (done) {
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
