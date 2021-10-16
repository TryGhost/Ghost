const should = require('should');
const sinon = require('sinon');
const express = require('../../../../../core/shared/express');
const serveFavicon = require('../../../../../core/frontend/web/middleware/serve-favicon');
const settingsCache = require('../../../../../core/shared/settings-cache');
const storage = require('../../../../../core/server/adapters/storage');
const configUtils = require('../../../../utils/configUtils');
const path = require('path');

describe('Serve Favicon', function () {
    let req;
    let res;
    let next;
    let blogApp;
    let localSettingsCache = {};
    let originalStoragePath;

    beforeEach(function () {
        req = sinon.spy();
        res = sinon.spy();
        next = sinon.spy();
        blogApp = express('test');
        req.app = blogApp;

        sinon.stub(settingsCache, 'get').callsFake(function (key) {
            return localSettingsCache[key];
        });

        originalStoragePath = storage.getStorage().storagePath;
    });

    afterEach(function () {
        sinon.restore();
        configUtils.restore();
        localSettingsCache = {};
        storage.getStorage().storagePath = originalStoragePath;
    });

    describe('serveFavicon', function () {
        it('should return a middleware', function () {
            const middleware = serveFavicon();

            middleware.should.be.a.Function();
        });

        it('should skip if the request does NOT match the file', function () {
            const middleware = serveFavicon();
            req.path = '/robots.txt';
            middleware(req, res, next);
            next.called.should.be.true();
        });

        describe('serves', function () {
            it('custom uploaded favicon.png', function (done) {
                const middleware = serveFavicon();
                req.path = '/favicon.png';

                storage.getStorage().storagePath = path.join(__dirname, '../../../../utils/fixtures/images/');
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
                const middleware = serveFavicon();
                req.path = '/favicon.ico';

                storage.getStorage().storagePath = path.join(__dirname, '../../../../utils/fixtures/images/');
                localSettingsCache.icon = 'favicon.ico';

                res = {
                    writeHead: function (statusCode) {
                        statusCode.should.eql(200);
                    },
                    end: function (body) {
                        body.length.should.eql(15406);
                        done();
                    }
                };

                middleware(req, res, next);
            });

            it('custom uploaded myicon.ico', function (done) {
                const middleware = serveFavicon();
                req.path = '/favicon.ico';

                storage.getStorage().storagePath = path.join(__dirname, '../../../../utils/fixtures/images/');
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
                const middleware = serveFavicon();
                req.path = '/favicon.ico';
                localSettingsCache.icon = '';

                res = {
                    writeHead: function (statusCode) {
                        statusCode.should.eql(200);
                    },
                    end: function (body) {
                        body.length.should.eql(15406);
                        done();
                    }
                };

                middleware(req, res, next);
            });
        });

        describe('redirects', function () {
            it('to custom favicon.ico when favicon.png is requested', function (done) {
                const middleware = serveFavicon();
                req.path = '/favicon.png';

                configUtils.set('paths:contentPath', path.join(__dirname, '../../../../test/utils/fixtures/'));
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
                const middleware = serveFavicon();
                req.path = '/favicon.ico';

                configUtils.set('paths:contentPath', path.join(__dirname, '../../../../test/utils/fixtures/'));
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
                const middleware = serveFavicon();
                req.path = '/favicon.png';

                configUtils.set('paths:publicFilePath', path.join(__dirname, '../../../../test/utils/fixtures/'));
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
