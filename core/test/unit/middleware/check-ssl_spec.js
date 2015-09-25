/*globals describe, it, beforeEach, afterEach */
/*jshint expr:true*/
var sinon    = require('sinon'),
    should   = require('should'),
    config   = require('../../../server/config'),
    checkSSL = require('../../../server/middleware/check-ssl');

should.equal(true, true);

describe('checkSSL', function () {
    var res, req, next, sandbox;

    beforeEach(function () {
        sandbox = sinon.sandbox.create();
        req = {};
        res = {};
        next = sandbox.spy();
    });

    afterEach(function () {
        sandbox.restore();
    });

    it('should not require SSL (frontend)', function (done) {
        req.url = '/';
        config.set({
            url: 'http://default.com:2368/'
        });
        checkSSL(req, res, next);
        next.called.should.be.true;
        next.calledWith().should.be.true;
        done();
    });

    it('should require SSL (frontend)', function (done) {
        req.url = '/';
        req.secure = true;
        config.set({
            url: 'https://default.com:2368/'
        });
        checkSSL(req, res, next);
        next.called.should.be.true;
        next.calledWith().should.be.true;
        done();
    });

    it('should not require SSL (admin)', function (done) {
        req.url = '/ghost';
        res.isAdmin = true;
        config.set({
            url: 'http://default.com:2368/'
        });
        checkSSL(req, res, next);
        next.called.should.be.true;
        next.calledWith().should.be.true;
        done();
    });

    it('should not redirect with SSL (admin)', function (done) {
        req.url = '/ghost';
        res.isAdmin = true;
        res.secure = true;
        config.set({
            url: 'http://default.com:2368/'
        });
        checkSSL(req, res, next);
        next.called.should.be.true;
        next.calledWith().should.be.true;
        done();
    });

    it('should not redirect with force admin SSL (admin)', function (done) {
        req.url = '/ghost';
        res.isAdmin = true;
        req.secure = true;
        config.set({
            url: 'http://default.com:2368/',
            forceAdminSSL: true
        });
        checkSSL(req, res, next);
        next.called.should.be.true;
        next.calledWith().should.be.true;
        done();
    });

    it('should redirect with force admin SSL (admin)', function (done) {
        req.url = '/ghost/';
        res.isAdmin = true;
        res.redirect = {};
        req.secure = false;
        config.set({
            url: 'http://default.com:2368/',
            urlSSL: '',
            forceAdminSSL: true
        });
        sandbox.stub(res, 'redirect', function (statusCode, url) {
            statusCode.should.eql(301);
            url.should.not.be.empty;
            url.should.eql('https://default.com:2368/ghost/');
            return;
        });
        checkSSL(req, res, next);
        next.called.should.be.false;
        done();
    });

    it('should redirect to subdirectory with force admin SSL (admin)', function (done) {
        req.url = '/blog/ghost/';
        res.isAdmin = true;
        res.redirect = {};
        req.secure = false;
        config.set({
            url: 'http://default.com:2368/blog/',
            urlSSL: '',
            forceAdminSSL: true
        });
        sandbox.stub(res, 'redirect', function (statusCode, url) {
            statusCode.should.eql(301);
            url.should.not.be.empty;
            url.should.eql('https://default.com:2368/blog/ghost/');
            return;
        });
        checkSSL(req, res, next);
        next.called.should.be.false;
        done();
    });

    it('should redirect and keep query with force admin SSL (admin)', function (done) {
        req.url = '/ghost/';
        req.query = {
            test: 'true'
        };
        res.isAdmin = true;
        res.redirect = {};
        req.secure = false;
        config.set({
            url: 'http://default.com:2368/',
            urlSSL: '',
            forceAdminSSL: true
        });
        sandbox.stub(res, 'redirect', function (statusCode, url) {
            statusCode.should.eql(301);
            url.should.not.be.empty;
            url.should.eql('https://default.com:2368/ghost/?test=true');
            return;
        });
        checkSSL(req, res, next);
        next.called.should.be.false;
        done();
    });

    it('should redirect with with config.url being SSL (frontend)', function (done) {
        req.url = '/';
        req.secure = false;
        res.redirect = {};
        config.set({
            url: 'https://default.com:2368',
            urlSSL: '',
            forceAdminSSL: true
        });
        sandbox.stub(res, 'redirect', function (statusCode, url) {
            statusCode.should.eql(301);
            url.should.not.be.empty;
            url.should.eql('https://default.com:2368/');
            return;
        });
        checkSSL(req, res, next);
        next.called.should.be.false;
        done();
    });

    it('should redirect to urlSSL (admin)', function (done) {
        req.url = '/ghost/';
        res.isAdmin = true;
        res.redirect = {};
        req.secure = false;
        config.set({
            url: 'http://default.com:2368/',
            urlSSL: 'https://ssl-domain.com:2368/'
        });
        sandbox.stub(res, 'redirect', function (statusCode, url) {
            statusCode.should.eql(301);
            url.should.not.be.empty;
            url.should.eql('https://ssl-domain.com:2368/ghost/');
            return;
        });
        checkSSL(req, res, next);
        next.called.should.be.false;
        done();
    });

    it('should not redirect if redirect:false (admin)', function (done) {
        req.url = '/ghost/';
        res.isAdmin = true;
        res.sendStatus = {};
        req.secure = false;
        config.set({
            url: 'http://default.com:2368/',
            forceAdminSSL: {
                redirect: false
            }
        });
        sandbox.stub(res, 'sendStatus', function (statusCode) {
            statusCode.should.eql(403);
            return;
        });
        checkSSL(req, res, next);
        next.called.should.be.false;
        done();
    });
});
