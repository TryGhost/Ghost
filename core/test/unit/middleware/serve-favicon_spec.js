var sinon        = require('sinon'),
    should       = require('should'),
    express      = require('express'),
    serveFavicon = require('../../../server/middleware/serve-favicon'),
    configUtils  = require('../../utils/configUtils'),
    path         = require('path'),
    sandbox      = sinon.sandbox.create();

should.equal(true, true);

describe('Serve Favicon', function () {
    var req, res, next, blogApp;

    beforeEach(function () {
        req = sinon.spy();
        res = sinon.spy();
        next = sinon.spy();
        blogApp = express();
        req.app = blogApp;
    });

    afterEach(function () {
        sandbox.restore();
        configUtils.restore();
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
                configUtils.set('paths:contentPath', path.join(__dirname, '../../../test/utils/fixtures/'));

                configUtils.set({
                    theme: {
                        icon: 'favicon.png'
                    }
                });

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
                configUtils.set('paths:contentPath', path.join(__dirname, '../../../test/utils/fixtures/'));

                configUtils.set({
                    theme: {
                        icon: 'favicon.ico'
                    }
                });

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
                configUtils.set('paths:corePath', path.join(__dirname, '../../../test/utils/fixtures/'));

                configUtils.set({
                    theme: {
                        icon: ''
                    }
                });

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

                configUtils.set({
                    theme: {
                        icon: 'favicon.ico'
                    }
                });

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

                configUtils.set({
                    theme: {
                        icon: 'favicon.png'
                    }
                });

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
                configUtils.set('paths:corePath', path.join(__dirname, '../../../test/utils/fixtures/'));

                configUtils.set({
                    theme: {
                        icon: ''
                    }
                });

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
