const should = require('should');
const sinon = require('sinon');
const rewire = require('rewire');
const urlUtils = require('../../../../../utils/urlUtils');
const configUtils = require('../../../../../utils/configUtils');
const urlRedirects = rewire('../../../../../../core/server/web/shared/middleware/url-redirects');
const {frontendSSLRedirect, adminSSLAndHostRedirect} = urlRedirects;
const getAdminRedirectUrl = urlRedirects.__get__('_private.getAdminRedirectUrl');
const getFrontendRedirectUrl = urlRedirects.__get__('_private.getFrontendRedirectUrl');
const redirect = urlRedirects.__get__('_private.redirect');

describe('UNIT: url redirects', function () {
    let res;
    let req;
    let next;
    let host;

    beforeEach(function () {
        req = {
            get vhost() {
                return {host: host};
            }
        };
        res = {
            redirect: sinon.spy(),
            set: sinon.spy()
        };

        next = sinon.spy();
    });

    afterEach(function () {
        sinon.restore();
        configUtils.restore();
        host = null;
    });

    describe('calls to _private.redirect()', function () {
        let redirectSpy;

        beforeEach(function () {
            redirectSpy = sinon.spy();
            urlRedirects.__set__('_private.redirect', redirectSpy);
        });

        it('frontendSSLRedirect passes getSiteRedirectUrl', function () {
            configUtils.set({url: 'https://default.com:2368/'});

            frontendSSLRedirect(req, res, next);

            redirectSpy.calledWith(req, res, next, getFrontendRedirectUrl).should.eql(true);
        });

        it('adminSSLAndHostRedirect passes getAdminRedirectUrl', function () {
            configUtils.set({url: 'https://default.com:2368/'});

            adminSSLAndHostRedirect(req, res, next);

            redirectSpy.calledWith(req, res, next, getAdminRedirectUrl).should.eql(true);
        });
    });

    describe('expect redirect', function () {
        it('site is https, request is http', function (done) {
            configUtils.set({
                url: 'https://default.com:2368/'
            });

            host = 'default.com:2368';

            req.originalUrl = '/';
            redirect(req, res, next, getFrontendRedirectUrl);
            next.called.should.be.false();
            res.redirect.called.should.be.true();
            res.redirect.calledWith(301, 'https://default.com:2368/').should.be.true();
            res.set.called.should.be.true();
            done();
        });

        it('site host is !== request host', function (done) {
            configUtils.set({
                url: 'https://default.com'
            });
            host = 'localhost:2368';

            req.originalUrl = '/';
            redirect(req, res, next, getFrontendRedirectUrl);
            next.called.should.be.false();
            res.redirect.called.should.be.true();
            res.redirect.calledWith(301, 'https://localhost:2368/').should.be.true();
            res.set.called.should.be.true();
            done();
        });

        describe(`admin redirects`, function () {
            it('url and admin url are equal, but protocol is different, request is http', function (done) {
                configUtils.set({
                    url: 'http://default.com:2368',
                    admin: {
                        url: 'https://default.com:2368'
                    }
                });

                host = 'default.com:2368';

                req.originalUrl = '/ghost';
                redirect(req, res, next, getAdminRedirectUrl);
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

                req.originalUrl = '/ghost';
                redirect(req, res, next, getAdminRedirectUrl);
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

                req.originalUrl = '/blog/ghost';
                redirect(req, res, next, getAdminRedirectUrl);
                next.called.should.be.false();
                res.redirect.calledWith(301, 'https://admin.default.com:2368/blog/ghost/').should.be.true();
                res.set.called.should.be.true();

                req.secure = true;
                host = 'admin.default.com:2368';
                redirect(req, res, next, getAdminRedirectUrl);
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

                req.originalUrl = '/ghost';
                req.query = {
                    test: true
                };

                redirect(req, res, next, getAdminRedirectUrl);
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

                req.originalUrl = '/ghost/something?a=b';
                req.query = {
                    a: 'b'
                };

                redirect(req, res, next, getAdminRedirectUrl);
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

                req.originalUrl = '/ghost';
                redirect(req, res, next, getAdminRedirectUrl);

                next.called.should.be.false();
                res.redirect.calledWith(301, 'https://default.com:2368/ghost/').should.be.true();
                res.set.called.should.be.true();

                res.redirect.resetHistory();

                req.secure = true;
                redirect(req, res, next, getAdminRedirectUrl);
                res.redirect.called.should.be.false();
                res.set.calledOnce.should.be.true();
                next.called.should.be.true();
                done();
            });
        });
    });

    describe('expect no redirect', function () {
        it('site is http, request is http', function (done) {
            configUtils.set({
                url: 'http://default.com:2368/'
            });

            host = 'default.com:2368';

            req.originalUrl = '/';
            redirect(req, res, next, getFrontendRedirectUrl);
            next.called.should.be.true();
            res.redirect.called.should.be.false();
            res.set.called.should.be.false();
            next.calledWith().should.be.true();
            done();
        });

        it('site is http, request is https', function (done) {
            configUtils.set({
                url: 'http://default.com:2368/'
            });

            host = 'default.com:2368';

            req.originalUrl = '/';
            req.secure = true;
            redirect(req, res, next, getFrontendRedirectUrl);
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
            redirect(req, res, next, getFrontendRedirectUrl);
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
            redirect(req, res, next, getFrontendRedirectUrl);
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
            redirect(req, res, next, getFrontendRedirectUrl);
            next.called.should.be.true();
            res.redirect.called.should.be.false();
            res.set.called.should.be.false();
            done();
        });

        describe(`admin redirects`, function () {
            it('admin is blog url and http, requester is http', function (done) {
                configUtils.set({
                    url: 'http://default.com:2368'
                });

                host = 'default.com:2368';

                req.originalUrl = '/ghost';
                redirect(req, res, next, getAdminRedirectUrl);
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

                req.originalUrl = '/ghost';
                redirect(req, res, next, getAdminRedirectUrl);
                next.called.should.be.true();
                res.redirect.called.should.be.false();
                res.set.called.should.be.false();
                done();
            });

            it('url and admin url are different, protocol is different, request is not secure', function (done) {
                configUtils.set({
                    url: 'http://ghost.org/blog/',
                    admin: {
                        url: 'http://something.com'
                    }
                });

                host = 'something.com';
                req.secure = false;

                req.originalUrl = '/ghost';
                redirect(req, res, next, getAdminRedirectUrl);
                res.redirect.called.should.be.false();
                res.set.called.should.be.false();
                next.called.should.be.true();
                done();
            });

            it('url and admin url are different, protocol is different, request is secure', function (done) {
                configUtils.set({
                    url: 'http://ghost.org/blog/',
                    admin: {
                        url: 'http://something.com'
                    }
                });

                host = 'something.com';
                req.secure = true;

                req.originalUrl = '/ghost';
                redirect(req, res, next, getAdminRedirectUrl);

                res.redirect.called.should.be.false();
                res.set.called.should.be.false();
                next.called.should.be.true();
                done();
            });

            it('url and admin url are different, request matches, uses a port', function (done) {
                configUtils.set({
                    url: 'https://default.com:2368',
                    admin: {
                        url: 'https://admin.default.com:2368'
                    }
                });

                host = 'admin.default.com:2368';

                req.secure = true;
                req.originalUrl = '/ghost';
                redirect(req, res, next, getAdminRedirectUrl);

                res.redirect.called.should.be.false();
                res.set.called.should.be.false();
                next.called.should.be.true();

                done();
            });
        });
    });
});
