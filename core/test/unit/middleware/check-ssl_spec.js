/*globals describe, it, beforeEach, afterEach */
/*jshint expr:true*/
var sinon    = require('sinon'),
    checkSSL = require('../../../server/middleware/check-ssl');

describe('checkSSL', function () {
    var sandbox, res, req, next;

    beforeEach(function () {
        sandbox = sinon.sandbox.create();
        req = sinon.spy();
        res = sinon.spy();
        next = sinon.spy();
    });

    afterEach(function () {
        sandbox.restore();
    });

    it('skips if already on SSL', function () {
        res.isAdmin = true;
        req.isSecure = true;
        checkSSL(req, res, next);
        next.called.should.be.true;
    });
});

describe('isSSLRequired', function () {
    var isSSLrequired = checkSSL.isSSLrequired;

    it('SSL is required if config.url starts with https', function () {
        isSSLrequired(undefined, 'https://example.com', undefined).should.be.true;
    });

    it('SSL is required if isAdmin and config.forceAdminSSL is set', function () {
        isSSLrequired(true, 'http://example.com', true).should.be.true;
    });

    it('SSL is not required if config.url starts with "http:/" and forceAdminSSL is not set', function () {
        isSSLrequired(false, 'http://example.com', false).should.be.false;
    });
});

describe('sslForbiddenOrRedirect', function () {
    var sslForbiddenOrRedirect = checkSSL.sslForbiddenOrRedirect;
    it('Return forbidden if config forces admin SSL for AdminSSL redirect is false.', function () {
        var response = sslForbiddenOrRedirect({
            forceAdminSSL: {redirect: false},
            configUrl: 'http://example.com'
        });
        response.isForbidden.should.be.true;
    });

    it('If not forbidden, should produce SSL to redirect to when config.url ends with no slash', function () {
        var response = sslForbiddenOrRedirect({
            forceAdminSSL: {redirect: true},
            configUrl: 'http://example.com/config/path',
            reqUrl: '/req/path'
        });
        response.isForbidden.should.be.false;
        response.redirectUrl({}).should.equal('https://example.com/config/path/req/path');
    });

    it('If config ends is slash, potential double-slash in resulting URL is removed', function () {
        var response = sslForbiddenOrRedirect({
            forceAdminSSL: {redirect: true},
            configUrl: 'http://example.com/config/path/',
            reqUrl: '/req/path'
        });
        response.redirectUrl({}).should.equal('https://example.com/config/path/req/path');
    });

    it('If config.urlSSL is provided it is preferred over config.url', function () {
        var response = sslForbiddenOrRedirect({
            forceAdminSSL: {redirect: true},
            configUrl: 'http://example.com/config/path/',
            configUrlSSL: 'https://example.com/ssl/config/path/',
            reqUrl: '/req/path'
        });
        response.redirectUrl({}).should.equal('https://example.com/ssl/config/path/req/path');
    });

    it('query string in request is preserved in redirect URL', function () {
        var response = sslForbiddenOrRedirect({
            forceAdminSSL: {redirect: true},
            configUrl: 'http://example.com/config/path/',
            configUrlSSL: 'https://example.com/ssl/config/path/',
            reqUrl: '/req/path'
        });
        response.redirectUrl({a: 'b'}).should.equal('https://example.com/ssl/config/path/req/path?a=b');
    });
});
