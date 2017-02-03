var sinon = require('sinon'),
    should = require('should'),
    configUtils = require('../../utils/configUtils'),
    checkSSL = require('../../../server/middleware/check-ssl'),
    sandbox = sinon.sandbox.create();

should.equal(true, true);

describe('checkSSL', function () {
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
        checkSSL(req, res, next);
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
        checkSSL(req, res, next);
        next.called.should.be.true();
        res.redirect.called.should.be.false();
        next.calledWith().should.be.true();
        done();
    });

    it('blog is https, requester uses http [redirect]', function (done) {
        configUtils.set({
            url: 'https://default.com:2368/'
        });

        host = 'default.com:2368';

        req.originalUrl = '/';
        checkSSL(req, res, next);
        next.called.should.be.false();
        res.redirect.called.should.be.true();
        done();
    });

    it('blog is http, requester uses https', function (done) {
        configUtils.set({
            url: 'http://default.com:2368/'
        });

        host = 'default.com:2368';

        req.originalUrl = '/';
        req.secure = true;
        checkSSL(req, res, next);
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
        checkSSL(req, res, next);
        next.called.should.be.true();
        res.redirect.called.should.be.false();
        done();
    });

    it('admin is blog url and http, requester is http', function (done) {
        configUtils.set({
            url: 'http://default.com:2368'
        });

        host = 'default.com:2368';
        res.isAdmin = true;

        req.originalUrl = '/ghost';
        checkSSL(req, res, next);
        next.called.should.be.true();
        res.redirect.called.should.be.false();
        done();
    });

    it('admin is custom url and https, requester is http [redirect]', function (done) {
        configUtils.set({
            url: 'http://default.com:2368',
            admin: {
                url: 'https://default.com:2368'
            }
        });

        host = 'default.com:2368';
        res.isAdmin = true;

        req.originalUrl = '/ghost';
        checkSSL(req, res, next);
        next.called.should.be.false();
        res.redirect.calledWith(301, 'https://default.com:2368/ghost').should.be.true();
        done();
    });

    it('admin is custom url and https, requester is http [redirect]', function (done) {
        configUtils.set({
            url: 'http://default.com:2368',
            admin: {
                url: 'https://admin.default.com:2368'
            }
        });

        host = 'default.com:2368';
        res.isAdmin = true;

        req.originalUrl = '/ghost';
        checkSSL(req, res, next);
        next.called.should.be.false();
        res.redirect.calledWith(301, 'https://admin.default.com:2368/ghost').should.be.true();
        done();
    });

    it('subdirectory [redirect]', function (done) {
        configUtils.set({
            url: 'http://default.com:2368/blog',
            admin: {
                url: 'https://admin.default.com:2368'
            }
        });

        host = 'default.com:2368';
        res.isAdmin = true;

        req.originalUrl = '/blog/ghost';
        checkSSL(req, res, next);
        next.called.should.be.false();
        res.redirect.calledWith(301, 'https://admin.default.com:2368/blog/ghost').should.be.true();
        done();
    });

    it('keeps query [redirect]', function (done) {
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

        checkSSL(req, res, next);
        next.called.should.be.false();
        res.redirect.calledWith(301, 'https://admin.default.com:2368/ghost?test=true').should.be.true();
        done();
    });
});
