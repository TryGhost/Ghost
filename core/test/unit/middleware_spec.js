/*globals describe, beforeEach, afterEach, it*/
/*jshint expr:true*/
var assert          = require('assert'),
    crypto          = require('crypto'),
    should          = require('should'),
    sinon           = require('sinon'),
    rewire          = require('rewire'),
    Promise         = require('bluebird'),
    _               = require('lodash'),
    express         = require('express'),
    api             = require('../../server/api'),
    errors          = require('../../server/errors'),
    fs              = require('fs'),
    defaultConfig   = require('../../../config.example')[process.env.NODE_ENV],

    // Thing we are testing
    setupMiddleware = rewire('../../server/middleware/index'),
    middleware      = setupMiddleware.middleware;

function hash(password, salt) {
    var hasher = crypto.createHash('sha256');
    hasher.update(password + salt, 'utf8');
    return hasher.digest('hex');
}

describe('Middleware', function () {
    var sandbox,
        apiSettingsStub;

    beforeEach(function () { sandbox = sinon.sandbox.create(); });
    afterEach(function () { sandbox.restore(); });

    describe('setupMiddleware', function () {
        var config;

        beforeEach(function () {
            config = setupMiddleware.__get__('config');
            config.set(_.merge({}, defaultConfig));      // isolate us from previously-run unit test file(s)
        });

        describe('when Ghost is used as an Express middleware component itself', function () {
            var useStub, blogApp, adminApp, error404, error500;

            beforeEach(function () {
                // be middleware
                config.asMiddleware = true;
                delete config.server;

                blogApp = express();
                adminApp = express();
                error404 = setupMiddleware.__get__('errors').error404;
                error500 = setupMiddleware.__get__('errors').error500;

                useStub = sandbox.stub(blogApp, 'use');
                sandbox.stub(setupMiddleware.__get__('oauth'), 'init');  // would need lots more setup to run in tests
            });

            it('installs setPathsFromMountpath as the very first middleware used', function () {
                var error,
                    shortCircuit = 'don\'t bother finishing initialization in this test';
                useStub.throws(shortCircuit);

                try {
                    setupMiddleware(blogApp, adminApp);
                } catch (e) {
                    error = e;
                }

                error.name.should.equal(shortCircuit);
                useStub.calledOnce.should.be.true;
                useStub.args[0][0].should.equal(middleware.setPathsFromMountpath);
            });

            describe('handles generate404s in the config', function () {
                it('should configure errors.error404 as middleware when config key missing', function (done) {
                    setupMiddleware(blogApp, adminApp);
                    useStub.calledWith(error404).should.be.true;
                    done();
                });

                it('should configure errors.error404 as middleware when true', function (done) {
                    config.generate404s = true;
                    setupMiddleware(blogApp, adminApp);
                    useStub.calledWith(error404).should.be.true;
                    done();
                });

                it('should NOT configure errors.error404 as middleware when false', function (done) {
                    config.generate404s = false;
                    setupMiddleware(blogApp, adminApp);
                    useStub.calledWith(error404).should.be.false;
                    done();
                });
            });

            describe('handles generate500s in the config', function () {
                it('should configure errors.error500 as middleware when config key missing', function (done) {
                    setupMiddleware(blogApp, adminApp);
                    useStub.calledWith(error500).should.be.true;
                    done();
                });

                it('should configure errors.error500 as middleware when true', function (done) {
                    config.generate500s = true;
                    setupMiddleware(blogApp, adminApp);
                    useStub.calledWith(error500).should.be.true;
                    done();
                });

                it('should NOT configure errors.error500 as middleware when false', function (done) {
                    config.generate500s = false;
                    setupMiddleware(blogApp, adminApp);
                    useStub.calledWith(error500).should.be.false;
                    done();
                });
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
            sandbox.stub(middleware, 'forwardToExpressStatic').yields();
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

    describe('checkSSL middleware', function () {
        var checkSSL = middleware.checkSSL,
            redirectCalled, nextCalled,
            mockResponse,
            nextFunction = function () { nextCalled = true; };

        beforeEach(function () {
            redirectCalled = nextCalled = false;
            mockResponse = {
                redirect: function () { redirectCalled = true; }
            };
        });

        it('passes the request on if it receives an HTTPS request', function () {
            var mockRequest = {secure: true};
            checkSSL(mockRequest, mockResponse, nextFunction);
            nextCalled.should.be.true;
            redirectCalled.should.be.false;
        });

        describe('receiving a non-SSL request', function () {
            var mockRequest = {secure: false};

            it('redirects to HTTPS if it is configured with an "https" url', function () {
                setupMiddleware.__get__('config').url = 'https://127.0.0.1:2369';
                checkSSL(mockRequest, mockResponse, nextFunction);
                nextCalled.should.be.false;
                redirectCalled.should.be.true;
            });

            it('passes the request on if there is no "url" in the configuration', function () {
                delete setupMiddleware.__get__('config').url;
                checkSSL(mockRequest, mockResponse, nextFunction);
                nextCalled.should.be.true;
                redirectCalled.should.be.false;
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
            }).catch(done);
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
            }).catch(done);
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
                    apiSettingsStub.withArgs(sinon.match.has('key', 'password')).returns(Promise.resolve({
                        settings: [{
                            key: 'password',
                            value: 'rightpassword'
                        }]
                    }));
                });

                it('authenticatePrivateSession should return next if hash is verified', function (done) {
                    var salt = Date.now().toString();

                    req.session = {
                        token: hash('rightpassword', salt),
                        salt: salt
                    };

                    middleware.authenticatePrivateSession(req, res, next).then(function () {
                        next.called.should.be.true;

                        done();
                    }).catch(done);
                });

                it('authenticatePrivateSession should redirect if hash is not verified', function (done) {
                    req.url = '/welcome-to-ghost';
                    req.session = {
                        token: 'wrongpassword',
                        salt: Date.now().toString()
                    };
                    res.redirect = sinon.spy();

                    middleware.authenticatePrivateSession(req, res, next).then(function () {
                        res.redirect.called.should.be.true;

                        done();
                    }).catch(done);
                });

                it('isPrivateSessionAuth should redirect if hash is verified', function (done) {
                    var salt = Date.now().toString();

                    req.session = {
                        token: hash('rightpassword', salt),
                        salt: salt
                    };
                    res.redirect = sandbox.spy();

                    middleware.isPrivateSessionAuth(req, res, next).then(function () {
                        res.redirect.called.should.be.true;

                        done();
                    }).catch(done);
                });

                it('isPrivateSessionAuth should return next if hash is not verified', function (done) {
                    req.session = {
                        token: 'wrongpassword',
                        salt: Date.now().toString()
                    };

                    middleware.isPrivateSessionAuth(req, res, next).then(function () {
                        next.called.should.be.true;

                        done();
                    }).catch(done);
                });

                it('authenticateProtection should return next if password is incorrect', function (done) {
                    req.body = {password: 'wrongpassword'};

                    middleware.authenticateProtection(req, res, next).then(function () {
                        res.error.should.not.be.empty;
                        next.called.should.be.true;

                        done();
                    }).catch(done);
                });

                it('authenticateProtection should redirect if password is correct', function (done) {
                    req.body = {password: 'rightpassword'};
                    req.session = {};
                    res.redirect = sandbox.spy();

                    middleware.authenticateProtection(req, res, next).then(function () {
                        res.redirect.called.should.be.true;

                        done();
                    }).catch(done);
                });
            });
        });
    });

    describe('setPathsFromMountpath middleware', function () {
        var setPathsFromMountpath, nextStub, config, mockRequest,
            newPath, expectedUrl,
            restoreUrl, restoreConfigUrl, restoreThemeUrl;

        beforeEach(function () {
            // overwrite so we have access to middleware module's internal config
            middleware =
                setupMiddleware.middleware =
                    rewire('../../server/middleware/middleware');

            setPathsFromMountpath = middleware.setPathsFromMountpath;
            nextStub = sinon.stub();
            config = middleware.__get__('config');
            newPath = '/our/site/blog';

            mockRequest = {
                protocol: 'proto',
                baseUrl: newPath,
                headers: {
                    host: 'locohostle:42'
                },
                get: function (key) {
                    return mockRequest.headers[key.toLowerCase()];
                }
            };
            expectedUrl = 'proto://locohostle:42/our/site/blog';

            restoreConfigUrl = config._config.url;
            restoreUrl = config.url;
            restoreThemeUrl = config.theme.url;
        });

        afterEach(function () {
            nextStub.called.should.be.true;

            config.theme.url.should.equal(expectedUrl);
            config.url.should.equal(expectedUrl);
            config._config.url.should.equal(expectedUrl);

            // restore global state for subsequent tests
            config._config.url = restoreConfigUrl;
            config.url = restoreUrl;
            config.theme.url = restoreThemeUrl;
        });

        it('copies from blogApp.mountpath to config fields', function () {
            middleware.__set__('blogApp', {mountpath: newPath});
            config.paths.subdir.should.not.equal(newPath);

            setPathsFromMountpath(mockRequest, {}, nextStub);
            config.paths.subdir.should.equal(newPath);
        });

        it('uses "x-forwarded-host" instead of "host" from headers, when present', function () {
            expectedUrl = 'proto://proxied.com/our/site/blog';
            mockRequest.headers['x-forwarded-host'] = 'proxied.com';
            middleware.__set__('blogApp', {mountpath: newPath});

            setPathsFromMountpath(mockRequest, {}, nextStub);
            config.paths.subdir.should.equal(newPath);
        });

        it('uses "x-forwarded-host" AND "x-forwarded-port" when both are present', function () {
            expectedUrl = 'https://proxied.com:8080/our/site/blog';
            mockRequest.headers['x-forwarded-host'] = 'proxied.com';
            mockRequest.headers['x-forwarded-port'] = '8080';
            mockRequest.protocol = 'https';
            middleware.__set__('blogApp', {mountpath: newPath});

            setPathsFromMountpath(mockRequest, {}, nextStub);
            config.paths.subdir.should.equal(newPath);
        });

        it('makes subdir empty if the mountpath is root', function () {
            middleware.__set__('blogApp', {mountpath: '/'});
            setPathsFromMountpath(mockRequest, {}, nextStub);
            config.paths.subdir.should.equal('');
        });
    });
});
