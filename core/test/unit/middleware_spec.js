/*globals describe, beforeEach, it*/
var assert          = require('assert'),
    should          = require('should'),
    sinon           = require('sinon'),
    when            = require('when'),
    _               = require('underscore'),
    express         = require('express'),
    Ghost           = require('../../ghost'),
    middleware      = require('../../server/middleware').middleware;

describe('Middleware', function () {

    describe('auth', function () {
        var req, res, ghost = new Ghost();

        beforeEach(function () {
            req = {
                session: {}
            };

            res = {
                redirect: sinon.spy()
            };

            ghost.notifications = [];
        });

        it('should redirect to signin path', function (done) {

            req.path = '';

            middleware.auth(req, res, null);
            assert(res.redirect.calledWithMatch('/ghost/signin/'));
            return done();
        });

        it('should redirect to signin path with redirect paramater stripped of /ghost/', function(done) {
            var path = 'test/path/party';

            req.path = '/ghost/' + path;

            middleware.auth(req, res, null);
            assert(res.redirect.calledWithMatch('/ghost/signin/?r=' + encodeURIComponent(path)));
            return done();
        });

        it('should only add one message to the notification array', function (done) {
            var path = 'test/path/party';

            req.path = '/ghost/' + path;

            middleware.auth(req, res, null);
            assert(res.redirect.calledWithMatch('/ghost/signin/?r=' + encodeURIComponent(path)));
            assert.equal(ghost.notifications.length, 1);

            middleware.auth(req, res, null);
            assert(res.redirect.calledWithMatch('/ghost/signin/?r=' + encodeURIComponent(path)));
            assert.equal(ghost.notifications.length, 1);

            return done();
        });

        it('should call next if session user exists', function (done) {
            req.session.user = {};

            middleware.auth(req, res, function (a) {
                should.not.exist(a);
                assert(res.redirect.calledOnce.should.be.false);
                return done();
            });
        });
    });

    describe('authAPI', function () {
        var req, res;

        beforeEach(function () {
            req = {
                session: {}
            };

            res = {
                redirect: sinon.spy(),
                json: sinon.spy()
            };
        });

        it('should return a json 401 error response', function (done) {
            middleware.authAPI(req, res, null);
            assert(res.json.calledWith(401, { error: 'Please sign in' }));
            return done();
        });

        it('should call next if a user exists in session', function (done) {
            req.session.user = {};

            middleware.authAPI(req, res, function (a) {
                should.not.exist(a);
                assert(res.redirect.calledOnce.should.be.false);
                return done();
            });
        });
    });

    describe('redirectToDashboard', function () {
        var req, res;

        beforeEach(function () {
            req = {
                session: {}
            };

            res = {
                redirect: sinon.spy()
            };
        });

        it('should redirect to dashboard', function (done) {
            req.session.user = {};

            middleware.redirectToDashboard(req, res, null);
            assert(res.redirect.calledWithMatch('/ghost/'));
            return done();
        });

        it('should call next if no user in session', function (done) {
            middleware.redirectToDashboard(req, res, function (a) {
                should.not.exist(a);
                assert(res.redirect.calledOnce.should.be.false);
                return done();
            });
        });
    });

    describe('cleanNotifications', function () {
        var ghost = new Ghost();

        beforeEach(function () {
            ghost.notifications = [
                {
                    status: 'passive',
                    message: 'passive-one'
                },
                {
                    status: 'passive',
                    message: 'passive-two'
                },
                {
                    status: 'aggressive',
                    message: 'aggressive'
                }
            ];
        });

        it('should clean all passive messages', function (done) {
            middleware.cleanNotifications(null, null, function () {
                assert.equal(ghost.notifications.length, 1);
                var passiveMsgs = _.filter(ghost.notifications, function (notification) {
                    return notification.status === 'passive';
                });
                assert.equal(passiveMsgs.length, 0);
                return done();
            });
        });
    });

    describe('disableCachedResult', function () {
        var res;

        beforeEach(function () {
            res = {
                set: sinon.spy()
            };
        });

        it('should set correct cache headers', function (done) {
            middleware.disableCachedResult(null, res, function () {
                assert(res.set.calledWith({
                    'Cache-Control': 'no-cache, must-revalidate',
                    'Expires': 'Sat, 26 Jul 1997 05:00:00 GMT'
                }));
                return done();
            });
        });
    });

    describe('whenEnabled', function () {
        var cbFn, ghost = new Ghost();

        beforeEach(function () {
            cbFn = sinon.spy();
            ghost.server = {
                enabled: function (setting) {
                    if (setting === 'enabled') {
                        return true;
                    } else {
                        return false;
                    }
                }
            };
        });

        it('should call function if setting is enabled', function (done) {
            var req = 1, res = 2, next = 3;

            middleware.whenEnabled('enabled', function (a, b, c) {
                assert.equal(a, 1);
                assert.equal(b, 2);
                assert.equal(c, 3);
                return done();
            })(req, res, next);
        });

        it('should call next() if setting is disabled', function (done) {
            middleware.whenEnabled('rando', cbFn)(null, null, function (a) {
                should.not.exist(a);
                cbFn.calledOnce.should.be.false;
                return done();
            });
        });
    });

    describe('staticTheme', function () {
        var realExpressStatic = express.static;

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
                return done();
            });
        });

        it('should call next if md file type', function (done) {
            var req = {
                url: 'README.md'
            };

            middleware.staticTheme(null)(req, null, function (a) {
                should.not.exist(a);
                middleware.forwardToExpressStatic.calledOnce.should.be.false;
                return done();
            });
        });

        it('should call next if json file type', function (done) {
            var req = {
                url: 'sample.json'
            };

            middleware.staticTheme(null)(req, null, function (a) {
                should.not.exist(a);
                middleware.forwardToExpressStatic.calledOnce.should.be.false;
                return done();
            });
        });

        it('should call express.static if valid file type', function (done) {
            var ghostStub = {
                    paths: function () {
                        return {activeTheme: 'ACTIVETHEME'};
                    }
                },
                req = {
                    url: 'myvalidfile.css'
                };

            middleware.staticTheme(null)(req, null, function (reqArg, res, next) {
                middleware.forwardToExpressStatic.calledOnce.should.be.true;
                assert.deepEqual(middleware.forwardToExpressStatic.args[0][0], req);
                return done();
            });
        });
    });
});

