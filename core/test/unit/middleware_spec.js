/*globals describe, beforeEach, afterEach, it*/
/*jshint expr:true*/
var assert          = require('assert'),
    should          = require('should'),
    sinon           = require('sinon'),
    Promise         = require('bluebird'),
    middleware      = require('../../server/middleware').middleware,
    api             = require('../../server/api'),
    errors          = require('../../server/errors'),
    bcrypt          = require('bcryptjs'),
    fs              = require('fs');

describe('Middleware', function () {
    var sandbox,
        apiSettingsStub;

    beforeEach(function () {
        sandbox = sinon.sandbox.create();
    });

    afterEach(function () {
        sandbox.restore();
    });
    // TODO: needs new test for ember admin
    // describe('redirectToDashboard', function () {
    //     var req, res;

    //     beforeEach(function () {
    //         req = {
    //             session: {}
    //         };

    //         res = {
    //             redirect: sinon.spy()
    //         };
    //     });

    //     it('should redirect to dashboard', function () {
    //         req.session.user = {};

    //         middleware.redirectToDashboard(req, res, null);
    //         assert(res.redirect.calledWithMatch('/ghost/'));
    //     });

    //     it('should call next if no user in session', function (done) {
    //         middleware.redirectToDashboard(req, res, function (a) {
    //             should.not.exist(a);
    //             assert(res.redirect.calledOnce.should.be.false);
    //             done();
    //         });
    //     });
    // });

    describe('cacheControl', function () {
        var res;

        beforeEach(function () {
            res = {
                set: sinon.spy()
            };
        });

        it('correctly sets the public profile headers', function (done) {
            middleware.cacheControl('public')(null, res, function (a) {
                should.not.exist(a);
                res.set.calledOnce.should.be.true;
                res.set.calledWith({'Cache-Control': 'public, max-age=0'});
                done();
            });
        });

        it('correctly sets the private profile headers', function (done) {
            middleware.cacheControl('private')(null, res, function (a) {
                should.not.exist(a);
                res.set.calledOnce.should.be.true;
                res.set.calledWith({
                    'Cache-Control':
                        'no-cache, private, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0'
                });
                done();
            });
        });

        it('will not set headers without a profile', function (done) {
            middleware.cacheControl()(null, res, function (a) {
                should.not.exist(a);
                res.set.called.should.be.false;
                done();
            });
        });
    });

    describe('whenEnabled', function () {
        var cbFn, blogApp;

        beforeEach(function () {
            cbFn = sinon.spy();
            blogApp = {
                enabled: function (setting) {
                    if (setting === 'enabled') {
                        return true;
                    } else {
                        return false;
                    }
                }
            };
            middleware.cacheBlogApp(blogApp);
        });

        it('should call function if setting is enabled', function (done) {
            var req = 1, res = 2, next = 3;

            middleware.whenEnabled('enabled', function (a, b, c) {
                assert.equal(a, 1);
                assert.equal(b, 2);
                assert.equal(c, 3);
                done();
            })(req, res, next);
        });

        it('should call next() if setting is disabled', function (done) {
            middleware.whenEnabled('rando', cbFn)(null, null, function (a) {
                should.not.exist(a);
                cbFn.calledOnce.should.be.false;
                done();
            });
        });
    });

    describe('staticTheme', function () {
        beforeEach(function () {
            sinon.stub(middleware, 'forwardToExpressStatic').yields();
        });

        afterEach(function () {
            middleware.forwardToExpressStatic.restore();
        });

        it('should call next if hbs file type', function (done) {
            var req = {
                url: 'mytemplate.hbs'
            };

            middleware.staticTheme(null)(req, null, function (a) {
                should.not.exist(a);
                middleware.forwardToExpressStatic.calledOnce.should.be.false;
                done();
            });
        });

        it('should call next if md file type', function (done) {
            var req = {
                url: 'README.md'
            };

            middleware.staticTheme(null)(req, null, function (a) {
                should.not.exist(a);
                middleware.forwardToExpressStatic.calledOnce.should.be.false;
                done();
            });
        });

        it('should call next if json file type', function (done) {
            var req = {
                url: 'sample.json'
            };

            middleware.staticTheme(null)(req, null, function (a) {
                should.not.exist(a);
                middleware.forwardToExpressStatic.calledOnce.should.be.false;
                done();
            });
        });

        it('should call express.static if valid file type', function (done) {
            var req = {
                    url: 'myvalidfile.css'
                };

            middleware.staticTheme(null)(req, null, function (reqArg, res, next) {
                /*jshint unused:false */
                middleware.forwardToExpressStatic.calledOnce.should.be.true;
                assert.deepEqual(middleware.forwardToExpressStatic.args[0][0], req);
                done();
            });
        });
    });

    describe('isSSLRequired', function () {
        var isSSLrequired = middleware.isSSLrequired;

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
        var sslForbiddenOrRedirect = middleware.sslForbiddenOrRedirect;
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

    describe('passProtect', function () {
        var req, res, next;

        beforeEach(function () {
            req = {}, res = {};
            apiSettingsStub = sandbox.stub(api.settings, 'read');
            next = sinon.spy();
        });

        it('checkIsPrivate should call next if not private', function (done) {
            apiSettingsStub.withArgs(sinon.match.has('key', 'isPrivate')).returns(Promise.resolve({
                settings: [{
                    key: 'isPrivate',
                    value: 'false'
                }]
            }));

            middleware.checkIsPrivate(req, res, next).then(function () {
                next.called.should.be.true;
                res.isPrivateBlog.should.be.false;
                done();
            });
        });

        it('checkIsPrivate should load session if private', function (done) {
            apiSettingsStub.withArgs(sinon.match.has('key', 'isPrivate')).returns(Promise.resolve({
                settings: [{
                    key: 'isPrivate',
                    value: 'true'
                }]
            }));

            middleware.checkIsPrivate(req, res, next).then(function () {
                res.isPrivateBlog.should.be.true;
                done();
            });
        });

        describe('not private', function () {
            beforeEach(function () {
                res.isPrivateBlog = false;
            });

            it('filterPrivateRoutes should call next if not private', function () {
                middleware.filterPrivateRoutes(req, res, next);
                next.called.should.be.true;
            });

            it('isPrivateSessionAuth should redirect if blog is not private', function () {
                res = {
                    redirect: sinon.spy(),
                    isPrivateBlog: false
                };
                middleware.isPrivateSessionAuth(req, res, next);
                res.redirect.called.should.be.true;
            });
        });

        describe('private', function () {
            var errorSpy;

            beforeEach(function () {
                res.isPrivateBlog = true;
                errorSpy = sandbox.spy(errors, 'error404');
                res = {
                    status: function () {
                        return this;
                    },
                    send: function () {},
                    set: function () {},
                    isPrivateBlog: true
                };
            });

            it('filterPrivateRoutes should call next if admin', function () {
                res.isAdmin = true;
                middleware.filterPrivateRoutes(req, res, next);
                next.called.should.be.true;
            });

            it('filterPrivateRoutes should call next if is the "private" route', function () {
                req.url = '/private/';
                middleware.filterPrivateRoutes(req, res, next);
                next.called.should.be.true;
            });

            it('filterPrivateRoutes should throw 404 if url is sitemap', function () {
                req.url = '/sitemap.xml';
                middleware.filterPrivateRoutes(req, res, next);
                errorSpy.called.should.be.true;
            });

            it('filterPrivateRoutes should throw 404 if url is rss', function () {
                req.url = '/rss';
                middleware.filterPrivateRoutes(req, res, next);
                errorSpy.called.should.be.true;
            });

            it('filterPrivateRoutes should throw 404 if url is rss plus something', function () {
                req.url = '/rss/sometag';
                middleware.filterPrivateRoutes(req, res, next);
                errorSpy.called.should.be.true;
            });

            it('filterPrivateRoutes should render custom robots.txt', function () {
                req.url = '/robots.txt';
                res.writeHead = sinon.spy();
                res.end = sinon.spy();
                sandbox.stub(fs, 'readFile', function (file, cb) {
                    cb(null, 'User-agent: * Disallow: /');
                });
                middleware.filterPrivateRoutes(req, res, next);
                res.writeHead.called.should.be.true;
                res.end.called.should.be.true;
            });

            it('authenticateProtection should call next if error', function () {
                res.error = 'Test Error';
                middleware.authenticateProtection(req, res, next);
                next.called.should.be.true;
            });

            describe('with hash verification', function () {
                beforeEach(function () {
                    sandbox.stub(bcrypt, 'compare', function (check, hash, cb) {
                        var isVerified = (check === hash) ? true : false;
                        cb(null, isVerified);
                    });
                    apiSettingsStub.withArgs(sinon.match.has('key', 'password')).returns(Promise.resolve({
                        settings: [{
                            key: 'password',
                            value: 'rightpassword'
                        }]
                    }));
                });

                it('authenticatePrivateSession should return next if hash is verified', function (done) {
                    req.session = {
                        token: 'rightpassword'
                    };
                    middleware.authenticatePrivateSession(req, res, next).then(function () {
                        next.called.should.be.true;
                        done();
                    });
                });

                it('authenticatePrivateSession should redirect if hash is not verified', function (done) {
                    req.url = '/welcome-to-ghost';
                    req.session = {
                        token: 'wrongpassword'
                    };
                    res.redirect = sinon.spy();
                    middleware.authenticatePrivateSession(req, res, next).then(function () {
                        res.redirect.called.should.be.true;
                        done();
                    });
                });

                it('isPrivateSessionAuth should redirect if hash is verified', function (done) {
                    req.session = {
                        token: 'rightpassword'
                    };
                    res.redirect = sandbox.spy();
                    middleware.isPrivateSessionAuth(req, res, next).then(function () {
                        res.redirect.called.should.be.true;
                        done();
                    });
                });

                it('isPrivateSessionAuth should return next if hash is not verified', function (done) {
                    req.session = {
                        token: 'wrongpassword'
                    };
                    middleware.isPrivateSessionAuth(req, res, next).then(function () {
                        next.called.should.be.true;
                        done();
                    });
                });

                it('authenticateProtection should return next if password is incorrect', function (done) {
                    req.body = {password:'wrongpassword'};
                    middleware.authenticateProtection(req, res, next).then(function () {
                        res.error.should.not.be.empty;
                        next.called.should.be.true;
                        done();
                    });
                });

                it('authenticateProtection should redirect if password is correct', function (done) {
                    req.body = {password:'rightpassword'};
                    req.session = {};
                    res.redirect = sandbox.spy();
                    sandbox.stub(bcrypt, 'hash', function (pass, salt, cb) {
                        cb(null, pass + 'hash');
                    });
                    middleware.authenticateProtection(req, res, next).then(function () {
                        req.session.token.should.equal('rightpasswordhash');
                        res.redirect.called.should.be.true;
                        done();
                    });
                });
            });
        });
    });
});
