/*globals describe, beforeEach, afterEach, it*/
var assert          = require('assert'),
    should          = require('should'),
    sinon           = require('sinon'),
    when            = require('when'),
    _               = require('underscore'),
    express         = require('express'),
    api             = require('../../server/api'),
    middleware      = require('../../server/middleware').middleware;

describe('Middleware', function () {

    describe('auth', function () {
        var req, res;

        beforeEach(function (done) {
            req = {
                session: {}
            };

            res = {
                redirect: sinon.spy()
            };

            api.notifications.destroyAll().then(function () {
                return done();
            });
        });

        it('should redirect to signin path', function (done) {

            req.path = '';

            middleware.auth(req, res, null).then(function () {
                assert(res.redirect.calledWithMatch('/ghost/signin/'));
                return done();
            });

        });

        it('should redirect to signin path with redirect paramater stripped of /ghost/', function(done) {
            var path = 'test/path/party';

            req.path = '/ghost/' + path;
            middleware.auth(req, res, null).then(function () {
                assert(res.redirect.calledWithMatch('/ghost/signin/?r=' + encodeURIComponent(path)));
                return done();
            });
        });

        it('should only add one message to the notification array', function (done) {
            var path = 'test/path/party';

            req.path = '/ghost/' + path;
            middleware.auth(req, res, null).then(function () {
                assert(res.redirect.calledWithMatch('/ghost/signin/?r=' + encodeURIComponent(path)));
                return api.notifications.browse().then(function (notifications) {
                    assert.equal(notifications.length, 1);
                    return;
                });
            }).then(function () {
                return middleware.auth(req, res, null);
            }).then(function () {
                assert(res.redirect.calledWithMatch('/ghost/signin/?r=' + encodeURIComponent(path)));
                return api.notifications.browse().then(function (notifications) {
                    assert.equal(notifications.length, 1);
                    return done();
                });
            });
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

        beforeEach(function (done) {
            api.notifications.add({
                id: 0,
                status: 'passive',
                message: 'passive-one'
            }).then(function () {
                return api.notifications.add({
                    id: 1,
                    status: 'passive',
                    message: 'passive-two'
                });
            }).then(function () {
                return api.notifications.add({
                    id: 2,
                    status: 'aggressive',
                    message: 'aggressive'
                });
            }).then(function () {
                done();
            });
        });

        it('should clean all passive messages', function (done) {
            middleware.cleanNotifications(null, null, function () {
                api.notifications.browse().then(function (notifications) {
                    should(notifications.length).eql(1);
                    var passiveMsgs = _.filter(notifications, function (notification) {
                        return notification.status === 'passive';
                    });
                    assert.equal(passiveMsgs.length, 0);
                    return done();
                });
            });
        });
    });

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
                return done();
            });
        });

        it('correctly sets the private profile headers', function (done) {
            middleware.cacheControl('private')(null, res, function (a) {
                should.not.exist(a);
                res.set.calledOnce.should.be.true;
                res.set.calledWith({'Cache-Control': 'no-cache, private, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0'});
                return done();
            });
        });

        it('will not set headers without a profile', function (done) {
            middleware.cacheControl()(null, res, function (a) {
                should.not.exist(a);
                res.set.called.should.be.false;
                return done();
            });
        });
    });

    describe('whenEnabled', function () {
        var cbFn, server;

        beforeEach(function () {
            cbFn = sinon.spy();
            server = {
                enabled: function (setting) {
                    if (setting === 'enabled') {
                        return true;
                    } else {
                        return false;
                    }
                }
            };
            middleware.cacheServer(server);
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

