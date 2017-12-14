var should = require('should'), // jshint ignore:line
    sinon = require('sinon'),
    configUtils = require('../../../utils/configUtils'),
    urlRedirects = require('../../../../server/web/middleware/url-redirects'),

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
            redirect: sandbox.spy(),
            set: sandbox.spy()
        };

        next = sandbox.spy();
    });

    afterEach(function () {
        sandbox.restore();
        configUtils.restore();
        host = null;
    });

    describe('expect redirect', function () {
        it('blog is https, request is http', function (done) {
            configUtils.set({
                url: 'https://default.com:2368/'
            });

            host = 'default.com:2368';

            req.originalUrl = '/';
            urlRedirects(req, res, next);
            next.called.should.be.false();
            res.redirect.called.should.be.true();
            res.redirect.calledWith(301, 'https://default.com:2368/').should.be.true();
            res.set.called.should.be.true();
            done();
        });

        it('blog host is !== request host', function (done) {
            configUtils.set({
                url: 'https://default.com'
            });

            host = 'localhost:2368';

            req.originalUrl = '/';
            urlRedirects(req, res, next);
            next.called.should.be.false();
            res.redirect.called.should.be.true();
            res.redirect.calledWith(301, 'https://localhost:2368/').should.be.true();
            res.set.called.should.be.true();
            done();
        });

        it('url and admin url are equal, but protocol is different, request is http', function (done) {
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
            res.redirect.calledWith(301, 'https://default.com:2368/ghost/').should.be.true();
            res.set.called.should.be.true();
            done();
        });

        it('url and admin url are different, request is http', function (done) {
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
            res.redirect.calledWith(301, 'https://admin.default.com:2368/ghost/').should.be.true();
            res.set.called.should.be.true();
            done();
        });

        it('subdirectory', function (done) {
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
            res.redirect.calledWith(301, 'https://admin.default.com:2368/blog/ghost/').should.be.true();
            res.set.called.should.be.true();

            req.secure = true;
            host = 'admin.default.com:2368';
            urlRedirects(req, res, next);
            next.called.should.be.true();
            res.redirect.calledOnce.should.be.true();
            res.set.calledOnce.should.be.true();
            done();
        });

        it('keeps query', function (done) {
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
            res.redirect.calledWith(301, 'https://admin.default.com:2368/ghost/?test=true').should.be.true();
            res.set.called.should.be.true();
            done();
        });

        it('original url has search params', function (done) {
            configUtils.set({
                url: 'http://default.com:2368',
                admin: {
                    url: 'https://admin.default.com:2368'
                }
            });

            host = 'default.com:2368';
            res.isAdmin = true;

            req.originalUrl = '/ghost/something?a=b';
            req.query = {
                a: 'b'
            };

            urlRedirects(req, res, next);
            next.called.should.be.false();
            res.redirect.calledWith(301, 'https://admin.default.com:2368/ghost/something/?a=b').should.be.true();
            res.set.called.should.be.true();
            done();
        });

        it('ensure redirect loop won\'t happen', function (done) {
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
            res.redirect.calledWith(301, 'https://default.com:2368/ghost/').should.be.true();
            res.set.called.should.be.true();

            res.redirect.reset();

            req.secure = true;
            urlRedirects(req, res, next);
            res.redirect.called.should.be.false();
            res.set.calledOnce.should.be.true();
            next.called.should.be.true();
            done();
        });
    });

    describe('expect no redirect', function () {
        it('blog is http, request is http', function (done) {
            configUtils.set({
                url: 'http://default.com:2368/'
            });

            host = 'default.com:2368';

            req.originalUrl = '/';
            urlRedirects(req, res, next);
            next.called.should.be.true();
            res.redirect.called.should.be.false();
            res.set.called.should.be.false();
            next.calledWith().should.be.true();
            done();
        });

        it('blog is http, request is https', function (done) {
            configUtils.set({
                url: 'http://default.com:2368/'
            });

            host = 'default.com:2368';

            req.originalUrl = '/';
            req.secure = true;
            urlRedirects(req, res, next);
            next.called.should.be.true();
            res.redirect.called.should.be.false();
            res.set.called.should.be.false();
            done();
        });

        it('blog is http, request is https (trailing slash is missing)', function (done) {
            configUtils.set({
                url: 'http://default.com:2368/'
            });

            host = 'default.com:2368/';

            req.originalUrl = '/';
            req.secure = true;
            urlRedirects(req, res, next);
            next.called.should.be.true();
            res.redirect.called.should.be.false();
            res.set.called.should.be.false();
            done();
        });

        it('blog is https, request is https', function (done) {
            configUtils.set({
                url: 'https://default.com:2368/'
            });

            host = 'default.com:2368';

            req.originalUrl = '/';
            req.secure = true;
            urlRedirects(req, res, next);
            next.called.should.be.true();
            res.redirect.called.should.be.false();
            res.set.called.should.be.false();
            next.calledWith().should.be.true();
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
            res.set.called.should.be.false();
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
            res.set.called.should.be.false();
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
            res.set.called.should.be.false();
            done();
        });

        it('url and admin url are different, protocol is different, request is not secure', function (done) {
            configUtils.set({
                url: 'http://blog.ghost.org',
                admin: {
                    url: 'http://something.com'
                }
            });

            host = 'something.com';
            res.isAdmin = true;
            req.secure = false;

            req.originalUrl = '/ghost';
            urlRedirects(req, res, next);
            res.redirect.called.should.be.false();
            res.set.called.should.be.false();
            next.called.should.be.true();
            done();
        });

        it('url and admin url are different, protocol is different, request is secure', function (done) {
            configUtils.set({
                url: 'http://blog.ghost.org',
                admin: {
                    url: 'http://something.com'
                }
            });

            host = 'something.com';
            res.isAdmin = true;
            req.secure = true;

            req.originalUrl = '/ghost';
            urlRedirects(req, res, next);

            res.redirect.called.should.be.false();
            res.set.called.should.be.false();
            next.called.should.be.true();
            done();
        });
    });
});
