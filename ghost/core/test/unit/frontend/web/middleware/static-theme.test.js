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
        res = {};

        activeThemeStub = sinon.stub(themeEngine, 'getActive').returns({
            path: 'my/fake/path'
        });

        expressStaticStub = sinon.spy(express, 'static');
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
});
