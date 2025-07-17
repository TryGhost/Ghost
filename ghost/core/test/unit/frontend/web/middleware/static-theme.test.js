const should = require('should');
const sinon = require('sinon');

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
            activeThemeStub.called.should.be.false();
            expressStaticStub.called.should.be.false();

            done();
        });
    });

    it('should skip for .md file', function (done) {
        req.path = 'README.md';

        staticTheme()(req, res, function next() {
            activeThemeStub.called.should.be.false();
            expressStaticStub.called.should.be.false();

            done();
        });
    });

    it('should skip for .json file', function (done) {
        req.path = 'sample.json';

        staticTheme()(req, res, function next() {
            activeThemeStub.called.should.be.false();
            expressStaticStub.called.should.be.false();

            done();
        });
    });

    it('should skip for .lock file', function (done) {
        req.path = 'yarn.lock';

        staticTheme()(req, res, function next() {
            activeThemeStub.called.should.be.false();
            expressStaticStub.called.should.be.false();

            done();
        });
    });

    it('should skip for gulp file', function (done) {
        req.path = 'gulpfile.js';

        staticTheme()(req, res, function next() {
            activeThemeStub.called.should.be.false();
            expressStaticStub.called.should.be.false();

            done();
        });
    });

    it('should skip for Grunt file', function (done) {
        req.path = 'Gulpfile.js';

        staticTheme()(req, res, function next() {
            activeThemeStub.called.should.be.false();
            expressStaticStub.called.should.be.false();

            done();
        });
    });

    it('should call express.static for .css file', function (done) {
        req.path = 'myvalidfile.css';

        staticTheme()(req, res, function next() {
            // Specifically gets called twice
            activeThemeStub.calledTwice.should.be.true();
            expressStaticStub.called.should.be.true();

            // Check that express static gets called with the theme path + maxAge
            should.exist(expressStaticStub.firstCall.args);
            expressStaticStub.firstCall.args[0].should.eql('my/fake/path');
            expressStaticStub.firstCall.args[1].should.be.an.Object().with.property('maxAge');

            done();
        });
    });

    it('should call express.static for .js file', function (done) {
        req.path = 'myvalidfile.js';

        staticTheme()(req, res, function next() {
            // Specifically gets called twice
            activeThemeStub.calledTwice.should.be.true();
            expressStaticStub.called.should.be.true();

            // Check that express static gets called with the theme path + maxAge
            should.exist(expressStaticStub.firstCall.args);
            expressStaticStub.firstCall.args[0].should.eql('my/fake/path');
            expressStaticStub.firstCall.args[1].should.be.an.Object().with.property('maxAge');

            done();
        });
    });

    it('should not error if active theme is missing', function (done) {
        req.path = 'myvalidfile.css';

        // make the active theme not exist
        activeThemeStub.returns(undefined);

        staticTheme()(req, res, function next() {
            activeThemeStub.calledOnce.should.be.true();
            expressStaticStub.called.should.be.false();

            done();
        });
    });

    it('should NOT skip if file is allowed', function (done) {
        req.path = 'manifest.json';

        staticTheme()(req, res, function next() {
            // Specifically gets called twice
            activeThemeStub.calledTwice.should.be.true();
            expressStaticStub.called.should.be.true();

            // Check that express static gets called with the theme path + maxAge
            should.exist(expressStaticStub.firstCall.args);
            expressStaticStub.firstCall.args[0].should.eql('my/fake/path');
            expressStaticStub.firstCall.args[1].should.be.an.Object().with.property('maxAge');

            done();
        });
    });

    it('should NOT skip if file is allowed even if nested', function (done) {
        req.path = '/.well-known/assetlinks.json';

        staticTheme()(req, res, function next() {
            // Specifically gets called twice
            activeThemeStub.calledTwice.should.be.true();
            expressStaticStub.called.should.be.true();

            // Check that express static gets called with the theme path + maxAge
            should.exist(expressStaticStub.firstCall.args);
            expressStaticStub.firstCall.args[0].should.eql('my/fake/path');
            expressStaticStub.firstCall.args[1].should.be.an.Object().with.property('maxAge');

            done();
        });
    });

    it('should NOT skip if file is in assets', function (done) {
        req.path = '/assets/whatever.json';

        staticTheme()(req, res, function next() {
            // Specifically gets called twice
            activeThemeStub.calledTwice.should.be.true();
            expressStaticStub.called.should.be.true();

            // Check that express static gets called with the theme path + maxAge
            should.exist(expressStaticStub.firstCall.args);
            expressStaticStub.firstCall.args[0].should.eql('my/fake/path');
            expressStaticStub.firstCall.args[1].should.be.an.Object().with.property('maxAge');

            done();
        });
    });

    it('should skip for .hbs file EVEN in /assets', function (done) {
        req.path = '/assets/mytemplate.hbs';

        staticTheme()(req, res, function next() {
            activeThemeStub.called.should.be.false();
            expressStaticStub.called.should.be.false();

            done();
        });
    });

    it('should disallow path traversal', function (done) {
        req.path = '/assets/built%2F..%2F..%2F/package.json';
        req.method = 'GET';

        staticTheme()(req, res, function next() {
            activeThemeStub.called.should.be.false();
            expressStaticStub.called.should.be.false();

            done();
        });
    });

    it('should not crash when malformatted URL sequence is passed', function (done) {
        req.path = '/assets/built%2F..%2F..%2F%E0%A4%A/package.json';
        req.method = 'GET';

        staticTheme()(req, res, function next() {
            activeThemeStub.called.should.be.false();
            expressStaticStub.called.should.be.false();

            done();
        });
    });

    describe('paths without file extensions', function () {
        it('should skip for root path /', function (done) {
            req.path = '/';

            staticTheme()(req, res, function next() {
                activeThemeStub.called.should.be.false();
                expressStaticStub.called.should.be.false();

                done();
            });
        });

        it('should skip for /about/', function (done) {
            req.path = '/about/';

            staticTheme()(req, res, function next() {
                activeThemeStub.called.should.be.false();
                expressStaticStub.called.should.be.false();

                done();
            });
        });

        it('should skip for /blog/my-post/', function (done) {
            req.path = '/blog/my-post/';

            staticTheme()(req, res, function next() {
                activeThemeStub.called.should.be.false();
                expressStaticStub.called.should.be.false();

                done();
            });
        });

        it('should skip for path without trailing slash /contact', function (done) {
            req.path = '/contact';

            staticTheme()(req, res, function next() {
                activeThemeStub.called.should.be.false();
                expressStaticStub.called.should.be.false();

                done();
            });
        });

        it('should NOT skip for file with extension without trailing slash', function (done) {
            req.path = '/somefile.txt';

            staticTheme()(req, res, function next() {
                // Specifically gets called twice
                activeThemeStub.calledTwice.should.be.true();
                expressStaticStub.called.should.be.true();

                // Check that express static gets called with the theme path + maxAge
                should.exist(expressStaticStub.firstCall.args);
                expressStaticStub.firstCall.args[0].should.eql('my/fake/path');
                expressStaticStub.firstCall.args[1].should.be.an.Object().with.property('maxAge');

                done();
            });
        });

        it('should NOT skip for file with extension with trailing slash', function (done) {
            req.path = '/somefile.txt/';

            staticTheme()(req, res, function next() {
                // Specifically gets called twice
                activeThemeStub.calledTwice.should.be.true();
                expressStaticStub.called.should.be.true();

                // Check that express static gets called with the theme path + maxAge
                should.exist(expressStaticStub.firstCall.args);
                expressStaticStub.firstCall.args[0].should.eql('my/fake/path');
                expressStaticStub.firstCall.args[1].should.be.an.Object().with.property('maxAge');

                done();
            });
        });

        it('should NOT skip for deeply nested file with extension', function (done) {
            req.path = '/deep/nested/path/file.css';

            staticTheme()(req, res, function next() {
                // Specifically gets called twice
                activeThemeStub.calledTwice.should.be.true();
                expressStaticStub.called.should.be.true();

                // Check that express static gets called with the theme path + maxAge
                should.exist(expressStaticStub.firstCall.args);
                expressStaticStub.firstCall.args[0].should.eql('my/fake/path');
                expressStaticStub.firstCall.args[1].should.be.an.Object().with.property('maxAge');

                done();
            });
        });
    });

    describe('fallthrough behavior', function () {
        it('should set fallthrough to true for /robots.txt', function (done) {
            req.path = '/robots.txt';

            staticTheme()(req, res, function next() {
                // Specifically gets called twice
                activeThemeStub.calledTwice.should.be.true();
                expressStaticStub.called.should.be.true();

                // Check that express static gets called with correct options
                should.exist(expressStaticStub.firstCall.args);
                expressStaticStub.firstCall.args[0].should.eql('my/fake/path');

                const options = expressStaticStub.firstCall.args[1];
                options.should.be.an.Object();
                options.should.have.property('maxAge');
                options.should.have.property('fallthrough', true);

                done();
            });
        });

        it('should set fallthrough to true for /sitemap.xml', function (done) {
            req.path = '/sitemap.xml';

            staticTheme()(req, res, function next() {
                // Specifically gets called twice
                activeThemeStub.calledTwice.should.be.true();
                expressStaticStub.called.should.be.true();

                // Check that express static gets called with correct options
                should.exist(expressStaticStub.firstCall.args);
                expressStaticStub.firstCall.args[0].should.eql('my/fake/path');

                const options = expressStaticStub.firstCall.args[1];
                options.should.be.an.Object();
                options.should.have.property('maxAge');
                options.should.have.property('fallthrough', true);

                done();
            });
        });

        it('should set fallthrough to true for /sitemap-posts.xml', function (done) {
            req.path = '/sitemap-posts.xml';

            staticTheme()(req, res, function next() {
                // Specifically gets called twice
                activeThemeStub.calledTwice.should.be.true();
                expressStaticStub.called.should.be.true();

                // Check that express static gets called with correct options
                should.exist(expressStaticStub.firstCall.args);
                expressStaticStub.firstCall.args[0].should.eql('my/fake/path');

                const options = expressStaticStub.firstCall.args[1];
                options.should.be.an.Object();
                options.should.have.property('maxAge');
                options.should.have.property('fallthrough', true);

                done();
            });
        });

        it('should set fallthrough to false for other static files', function (done) {
            req.path = '/style.css';

            staticTheme()(req, res, function next() {
                // Specifically gets called twice
                activeThemeStub.calledTwice.should.be.true();
                expressStaticStub.called.should.be.true();

                // Check that express static gets called with correct options
                should.exist(expressStaticStub.firstCall.args);
                expressStaticStub.firstCall.args[0].should.eql('my/fake/path');

                const options = expressStaticStub.firstCall.args[1];
                options.should.be.an.Object();
                options.should.have.property('maxAge');
                options.should.have.property('fallthrough', false);

                done();
            });
        });

        it('should set fallthrough to false for nested files', function (done) {
            req.path = '/assets/style.css';

            staticTheme()(req, res, function next() {
                // Specifically gets called twice
                activeThemeStub.calledTwice.should.be.true();
                expressStaticStub.called.should.be.true();

                // Check that express static gets called with correct options
                should.exist(expressStaticStub.firstCall.args);
                expressStaticStub.firstCall.args[0].should.eql('my/fake/path');

                const options = expressStaticStub.firstCall.args[1];
                options.should.be.an.Object();
                options.should.have.property('maxAge');
                options.should.have.property('fallthrough', false);

                done();
            });
        });

        it('should set fallthrough to false for allowed special files like manifest.json', function (done) {
            req.path = '/manifest.json';

            staticTheme()(req, res, function next() {
                // Specifically gets called twice
                activeThemeStub.calledTwice.should.be.true();
                expressStaticStub.called.should.be.true();

                // Check that express static gets called with correct options
                should.exist(expressStaticStub.firstCall.args);
                expressStaticStub.firstCall.args[0].should.eql('my/fake/path');

                const options = expressStaticStub.firstCall.args[1];
                options.should.be.an.Object();
                options.should.have.property('maxAge');
                options.should.have.property('fallthrough', false);

                done();
            });
        });
    });
});
