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

    afterEach(async function () {
        sinon.restore();
        await configUtils.restore();
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
            it('custom uploaded favicon.png', function (done) {
                const middleware = serveFavicon();
                req.path = '/favicon.png';

                storage.getStorage().storagePath = path.join(__dirname, '../../../../utils/fixtures/images/');
                localSettingsCache.icon = '/content/images/favicon.png';

                res = {
                    redirect: function (statusCode, p) {
                        statusCode.should.eql(302);
                        p.should.eql('/content/images/size/w256h256/favicon.png');
                        done();
                    }
                };

                middleware(req, res, next);
            });

            it('custom uploaded favicon.webp', function (done) {
                const middleware = serveFavicon();
                req.path = '/favicon.png';

                storage.getStorage().storagePath = path.join(__dirname, '../../../../utils/fixtures/images/');
                localSettingsCache.icon = '/content/images/favicon.webp';

                res = {
                    redirect: function (statusCode, p) {
                        statusCode.should.eql(302);
                        p.should.eql('/content/images/size/w256h256/format/png/favicon.webp');
                        done();
                    }
                };

                middleware(req, res, next);
            });

            it('custom uploaded favicon.ico', function (done) {
                const middleware = serveFavicon();
                req.path = '/favicon.ico';

                storage.getStorage().storagePath = path.join(__dirname, '../../../../utils/fixtures/images/');
                localSettingsCache.icon = '/content/images/favicon.ico';

                res = {
                    redirect: function (statusCode, p) {
                        statusCode.should.eql(302);
                        p.should.eql('/content/images/favicon.ico');
                        done();
                    }
                };

                middleware(req, res, next);
            });

            it('to favicon.ico when favicon.png is requested', function (done) {
                const middleware = serveFavicon();
                req.path = '/favicon.png';

                configUtils.set('paths:publicFilePath', path.join(__dirname, '../../../../test/utils/fixtures/'));
                localSettingsCache.icon = null;

                res = {
                    redirect: function (statusCode, p) {
                        statusCode.should.eql(302);
                        p.should.eql('/favicon.ico');
                        done();
                    }
                };

                middleware(req, res, next);
            });
        });
    });
});
