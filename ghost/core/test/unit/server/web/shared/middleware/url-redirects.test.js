const sinon = require('sinon');
const rewire = require('rewire');
const configUtils = require('../../../../../utils/config-utils');
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

    afterEach(async function () {
        sinon.restore();
        await configUtils.restore();
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

            sinon.assert.calledWith(redirectSpy, req, res, next, getFrontendRedirectUrl);
        });

        it('adminSSLAndHostRedirect passes getAdminRedirectUrl', function () {
            configUtils.set({url: 'https://default.com:2368/'});

            adminSSLAndHostRedirect(req, res, next);

            sinon.assert.calledWith(redirectSpy, req, res, next, getAdminRedirectUrl);
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
            sinon.assert.notCalled(next);
            sinon.assert.called(res.redirect);
            sinon.assert.calledWith(res.redirect, 301, 'https://default.com:2368/');
            sinon.assert.called(res.set);
            done();
        });

        it('site host is !== request host', function (done) {
            configUtils.set({
                url: 'https://default.com'
            });
            host = 'localhost:2368';

            req.originalUrl = '/';
            redirect(req, res, next, getFrontendRedirectUrl);
            sinon.assert.notCalled(next);
            sinon.assert.called(res.redirect);
            sinon.assert.calledWith(res.redirect, 301, 'https://localhost:2368/');
            sinon.assert.called(res.set);
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
                sinon.assert.notCalled(next);
                sinon.assert.calledWith(res.redirect, 301, 'https://default.com:2368/ghost/');
                sinon.assert.called(res.set);
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
                sinon.assert.notCalled(next);
                sinon.assert.calledWith(res.redirect, 301, 'https://admin.default.com:2368/ghost/');
                sinon.assert.called(res.set);
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
                sinon.assert.notCalled(next);
                sinon.assert.calledWith(res.redirect, 301, 'https://admin.default.com:2368/blog/ghost/');
                sinon.assert.called(res.set);

                req.secure = true;
                host = 'admin.default.com:2368';
                redirect(req, res, next, getAdminRedirectUrl);
                sinon.assert.called(next);
                sinon.assert.calledOnce(res.redirect);
                sinon.assert.calledOnce(res.set);
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
                sinon.assert.notCalled(next);
                sinon.assert.calledWith(res.redirect, 301, 'https://admin.default.com:2368/ghost/?test=true');
                sinon.assert.called(res.set);
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
                sinon.assert.notCalled(next);
                sinon.assert.calledWith(res.redirect, 301, 'https://admin.default.com:2368/ghost/something/?a=b');
                sinon.assert.called(res.set);
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

                sinon.assert.notCalled(next);
                sinon.assert.calledWith(res.redirect, 301, 'https://default.com:2368/ghost/');
                sinon.assert.called(res.set);

                res.redirect.resetHistory();

                req.secure = true;
                redirect(req, res, next, getAdminRedirectUrl);
                sinon.assert.notCalled(res.redirect);
                sinon.assert.calledOnce(res.set);
                sinon.assert.called(next);
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
            sinon.assert.called(next);
            sinon.assert.notCalled(res.redirect);
            sinon.assert.notCalled(res.set);
            sinon.assert.calledWith(next);
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
            sinon.assert.called(next);
            sinon.assert.notCalled(res.redirect);
            sinon.assert.notCalled(res.set);
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
            sinon.assert.called(next);
            sinon.assert.notCalled(res.redirect);
            sinon.assert.notCalled(res.set);
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
            sinon.assert.called(next);
            sinon.assert.calledWith(next);
            sinon.assert.notCalled(res.redirect);
            sinon.assert.notCalled(res.set);
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
            sinon.assert.called(next);
            sinon.assert.notCalled(res.redirect);
            sinon.assert.notCalled(res.set);
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
                sinon.assert.called(next);
                sinon.assert.notCalled(res.redirect);
                sinon.assert.notCalled(res.set);
                done();
            });

            it('admin request, no custom admin.url configured', function (done) {
                configUtils.set({
                    url: 'http://default.com:2368'
                });

                host = 'localhost:2368';

                req.originalUrl = '/ghost';
                redirect(req, res, next, getAdminRedirectUrl);
                sinon.assert.called(next);
                sinon.assert.notCalled(res.redirect);
                sinon.assert.notCalled(res.set);
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
                sinon.assert.notCalled(res.redirect);
                sinon.assert.notCalled(res.set);
                sinon.assert.called(next);
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

                sinon.assert.notCalled(res.redirect);
                sinon.assert.notCalled(res.set);
                sinon.assert.called(next);
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

                sinon.assert.notCalled(res.redirect);
                sinon.assert.notCalled(res.set);
                sinon.assert.called(next);

                done();
            });
        });
    });
});
