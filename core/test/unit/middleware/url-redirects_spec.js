var should = require('should'), // jshint ignore:line
    sinon = require('sinon'),
    configUtils = require('../../utils/configUtils'),
    urlRedirects = require('../../../server/middleware/url-redirects'),

    sandbox = sinon.sandbox.create();

describe('UNIT: url redirects', function () {
    var res, req, next, host;

    beforeEach(function () {
        req = {
            get: function get() {
                return host;
            }
        };
        res = {
            redirect: sandbox.spy()
        };

        next = sandbox.spy();
    });

    afterEach(function () {
        sandbox.restore();
        configUtils.restore();
        host = null;
    });

    it('blog is http, requester uses http', function (done) {
        configUtils.set({
            url: 'http://default.com:2368/'
        });

        host = 'default.com:2368';

        req.originalUrl = '/';
        urlRedirects(req, res, next);
        next.called.should.be.true();
        res.redirect.called.should.be.false();
        next.calledWith().should.be.true();
        done();
    });

    it('blog is https, requester uses https', function (done) {
        configUtils.set({
            url: 'https://default.com:2368/'
        });

        host = 'default.com:2368';

        req.originalUrl = '/';
        req.secure = true;
        urlRedirects(req, res, next);
        next.called.should.be.true();
        res.redirect.called.should.be.false();
        next.calledWith().should.be.true();
        done();
    });

    it('[redirect] blog is https, requester uses http', function (done) {
        configUtils.set({
            url: 'https://default.com:2368/'
        });

        host = 'default.com:2368';

        req.originalUrl = '/';
        urlRedirects(req, res, next);
        next.called.should.be.false();
        res.redirect.called.should.be.true();
        res.redirect.calledWith(301, 'https://default.com:2368/').should.be.true();
        done();
    });

    it('blog is http, requester uses https', function (done) {
        configUtils.set({
            url: 'http://default.com:2368/'
        });

        host = 'default.com:2368';

        req.originalUrl = '/';
        req.secure = true;
        urlRedirects(req, res, next);
        next.called.should.be.true();
        res.redirect.called.should.be.false();
        done();
    });

    it('blog is http, requester uses https', function (done) {
        configUtils.set({
            url: 'http://default.com:2368/'
        });

        host = 'default.com:2368/';

        req.originalUrl = '/';
        req.secure = true;
        urlRedirects(req, res, next);
        next.called.should.be.true();
        res.redirect.called.should.be.false();
        done();
    });

    it('blog host is !== request host', function (done) {
        configUtils.set({
            url: 'https://default.com'
        });

        host = 'localhost:2368';

        req.originalUrl = '/';
        req.secure = true;
        urlRedirects(req, res, next);
        next.called.should.be.true();
        res.redirect.called.should.be.false();
        done();
    });

    it('[redirect] blog host is !== request host', function (done) {
        configUtils.set({
            url: 'https://default.com'
        });

        host = 'localhost:2368';

        req.originalUrl = '/';
        urlRedirects(req, res, next);
        next.called.should.be.false();
        res.redirect.called.should.be.true();
        res.redirect.calledWith(301, 'https://localhost:2368/').should.be.true();
        done();
    });

    it('admin is blog url and http, requester is http', function (done) {
        configUtils.set({
            url: 'http://default.com:2368'
        });

        host = 'default.com:2368';
        res.isAdmin = true;

        req.originalUrl = '/ghost';
        urlRedirects(req, res, next);
        next.called.should.be.true();
        res.redirect.called.should.be.false();
        done();
    });

    it('admin request, no custom admin.url configured', function (done) {
        configUtils.set({
            url: 'http://default.com:2368'
        });

        host = 'localhost:2368';
        res.isAdmin = true;

        req.originalUrl = '/ghost';
        urlRedirects(req, res, next);
        next.called.should.be.true();
        res.redirect.called.should.be.false();
        done();
    });

    it('[redirect] admin is custom url and https, requester is http', function (done) {
        configUtils.set({
            url: 'http://default.com:2368',
            admin: {
                url: 'https://default.com:2368'
            }
        });

        host = 'default.com:2368';
        res.isAdmin = true;

        req.originalUrl = '/ghost';
        urlRedirects(req, res, next);
        next.called.should.be.false();
        res.redirect.calledWith(301, 'https://default.com:2368/ghost').should.be.true();
        done();
    });

    it('[redirect] admin is custom url and https, requester is http', function (done) {
        configUtils.set({
            url: 'http://default.com:2368',
            admin: {
                url: 'https://admin.default.com:2368'
            }
        });

        host = 'default.com:2368';
        res.isAdmin = true;

        req.originalUrl = '/ghost';
        urlRedirects(req, res, next);
        next.called.should.be.false();
        res.redirect.calledWith(301, 'https://admin.default.com:2368/ghost').should.be.true();
        done();
    });

    it('[redirect] subdirectory', function (done) {
        configUtils.set({
            url: 'http://default.com:2368/blog',
            admin: {
                url: 'https://admin.default.com:2368'
            }
        });

        host = 'default.com:2368';
        res.isAdmin = true;

        req.originalUrl = '/blog/ghost';
        urlRedirects(req, res, next);
        next.called.should.be.false();
        res.redirect.calledWith(301, 'https://admin.default.com:2368/blog/ghost').should.be.true();
        done();
    });

    it('[redirect] keeps query', function (done) {
        configUtils.set({
            url: 'http://default.com:2368',
            admin: {
                url: 'https://admin.default.com:2368'
            }
        });

        host = 'default.com:2368';
        res.isAdmin = true;

        req.originalUrl = '/ghost';
        req.query = {
            test: true
        };

        urlRedirects(req, res, next);
        next.called.should.be.false();
        res.redirect.calledWith(301, 'https://admin.default.com:2368/ghost?test=true').should.be.true();
        done();
    });
});
