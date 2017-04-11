var should = require('should'), // jshint ignore:line
    sinon = require('sinon'),
    express = require('express'),
    serveFavicon = require('../../../server/middleware/serve-favicon'),
    settingsCache = require('../../../server/settings/cache'),
    storage = require('../../../server/storage'),
    configUtils = require('../../utils/configUtils'),
    path = require('path'),

    sandbox = sinon.sandbox.create();

describe('Serve Favicon', function () {
    var req, res, next, blogApp, localSettingsCache = {}, originalStoragePath;

    beforeEach(function () {
        req = sinon.spy();
        res = sinon.spy();
        next = sinon.spy();
        blogApp = express();
        req.app = blogApp;

        sandbox.stub(settingsCache, 'get', function (key) {
            return localSettingsCache[key];
        });

        originalStoragePath = storage.getStorage().storagePath;
    });

    afterEach(function () {
        sandbox.restore();
        configUtils.restore();
        localSettingsCache = {};
        storage.getStorage().storagePath = originalStoragePath;
    });

    describe('serveFavicon', function () {
        it('should return a middleware', function () {
            var middleware = serveFavicon();

            middleware.should.be.a.Function();
        });

        it('should skip if the request does NOT match the file', function () {
            var middleware = serveFavicon();
            req.path = '/robots.txt';
            middleware(req, res, next);
            next.called.should.be.true();
        });

        describe('serves', function () {
            it('custom uploaded favicon.png', function (done) {
                var middleware = serveFavicon();
                req.path = '/favicon.png';

                storage.getStorage().storagePath = path.join(__dirname, '../../../test/utils/fixtures/images/');
                localSettingsCache.icon = 'favicon.png';

                res = {
                    writeHead: function (statusCode) {
                        statusCode.should.eql(200);
                    },
                    end: function (body) {
                        body.length.should.eql(6792);
                        done();
                    }
                };

                middleware(req, res, next);
            });

            it('custom uploaded favicon.ico', function (done) {
                var middleware = serveFavicon();
                req.path = '/favicon.ico';

                storage.getStorage().storagePath = path.join(__dirname, '../../../test/utils/fixtures/images/');
                localSettingsCache.icon = 'favicon.ico';

                res = {
                    writeHead: function (statusCode) {
                        statusCode.should.eql(200);
                    },
                    end: function (body) {
                        body.length.should.eql(15086);
                        done();
                    }
                };

                middleware(req, res, next);
            });

            it('custom uploaded myicon.ico', function (done) {
                var middleware = serveFavicon();
                req.path = '/favicon.ico';

                storage.getStorage().storagePath = path.join(__dirname, '../../../test/utils/fixtures/images/');
                localSettingsCache.icon = 'myicon.ico';

                res = {
                    writeHead: function (statusCode) {
                        statusCode.should.eql(200);
                    },
                    end: function (body) {
                        body.length.should.eql(15086);
                        done();
                    }
                };

                middleware(req, res, next);
            });

            it('default favicon.ico', function (done) {
                var middleware = serveFavicon();
                req.path = '/favicon.ico';
                localSettingsCache.icon = '';

                res = {
                    writeHead: function (statusCode) {
                        statusCode.should.eql(200);
                    },
                    end: function (body) {
                        body.length.should.eql(34494);
                        done();
                    }
                };

                middleware(req, res, next);
            });
        });

        describe.skip('serves with subdirectory setup', function () {
            beforeEach(function () {
                sandbox
                    .stub(storage.getStorage(), 'read')
                    .returns(new Promise.resolve('<Buffer 2c be a4 40 f7 87 73 1e 57 2c c1 e4 0d 79 03 95 42 f0 42 2e 41 95 27 c9 5c 35 a7 71 2c 09 5a 57 d3 04 1e 83 03 28 07 96 b0 c8 88 65 07 7a d1 d6 63 50>'));
            });

            it('custom uploaded favicon.png', function (done) {
                var middleware = serveFavicon();
                req.path = '/favicon.png';

                configUtils.set('url', 'https://my-blog.com/blog/');

                localSettingsCache.icon = 'favicon.png';

                res = {
                    writeHead: function (statusCode) {
                        statusCode.should.eql(200);
                    },
                    end: function (body) {
                        body.length.should.eql(6792);
                        done();
                    }
                };

                middleware(req, res, next);
            });

            it('custom uploaded favicon.ico', function (done) {
                var middleware = serveFavicon();
                req.path = '/favicon.ico';

                storage.getStorage().storagePath = path.join(__dirname, '../../../test/utils/fixtures/images/');
                localSettingsCache.icon = 'favicon.ico';

                res = {
                    writeHead: function (statusCode) {
                        statusCode.should.eql(200);
                    },
                    end: function (body) {
                        body.length.should.eql(15086);
                        done();
                    }
                };

                middleware(req, res, next);
            });

            it('custom uploaded myicon.ico', function (done) {
                var middleware = serveFavicon();
                req.path = '/favicon.ico';

                storage.getStorage().storagePath = path.join(__dirname, '../../../test/utils/fixtures/images/');
                localSettingsCache.icon = 'myicon.ico';

                res = {
                    writeHead: function (statusCode) {
                        statusCode.should.eql(200);
                    },
                    end: function (body) {
                        body.length.should.eql(15086);
                        done();
                    }
                };

                middleware(req, res, next);
            });

            it('default favicon.ico', function (done) {
                var middleware = serveFavicon();
                req.path = '/favicon.ico';
                localSettingsCache.icon = '';

                res = {
                    writeHead: function (statusCode) {
                        statusCode.should.eql(200);
                    },
                    end: function (body) {
                        body.length.should.eql(15086);
                        done();
                    }
                };

                middleware(req, res, next);
            });
        });

        describe('redirects', function () {
            it('to custom favicon.ico when favicon.png is requested', function (done) {
                var middleware = serveFavicon();
                req.path = '/favicon.png';

                configUtils.set('paths:contentPath', path.join(__dirname, '../../../test/utils/fixtures/'));
                localSettingsCache.icon = 'favicon.ico';

                res = {
                    redirect: function (statusCode) {
                        statusCode.should.eql(302);
                        done();
                    }
                };

                middleware(req, res, next);
            });

            it('to custom favicon.png when favicon.ico is requested', function (done) {
                var middleware = serveFavicon();
                req.path = '/favicon.ico';

                configUtils.set('paths:contentPath', path.join(__dirname, '../../../test/utils/fixtures/'));
                localSettingsCache.icon = 'favicon.png';

                res = {
                    redirect: function (statusCode) {
                        statusCode.should.eql(302);
                        done();
                    }
                };

                middleware(req, res, next);
            });

            it('to favicon.ico when favicon.png is requested', function (done) {
                var middleware = serveFavicon();
                req.path = '/favicon.png';

                configUtils.set('paths:publicFilePath', path.join(__dirname, '../../../test/utils/fixtures/'));
                localSettingsCache.icon = '';

                res = {
                    redirect: function (statusCode) {
                        statusCode.should.eql(302);
                        done();
                    }
                };

                middleware(req, res, next);
            });
        });
    });
});
