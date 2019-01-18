const sessionService = require('../../../../../server/services/auth/session');
const SessionStore = require('../../../../../server/services/auth/session/store');
const config = require('../../../../../server/config');
const models = require('../../../../../server/models');
const sinon = require('sinon');
const should = require('should');
const {
    BadRequestError,
    UnauthorizedError,
    InternalServerError
} = require('../../../../../server/lib/common/errors');

describe('Session Service', function () {
    let sandbox;
    before(function () {
        models.init();
        sandbox = sinon.sandbox.create();
    });

    afterEach(function () {
        sandbox.restore();
    });

    const fakeReq = function fakeReq() {
        return {
            session: {
                destroy() {}
            },
            body: {},
            get() {}
        };
    };

    const fakeRes = function fakeRes() {
        return {
            sendStatus() {}
        };
    };

    describe('createSession', function () {
        it('calls next with a BadRequestError if there is no Origin or Refferer', function (done) {
            const req = fakeReq();
            sandbox.stub(req, 'get')
                .withArgs('origin').returns('')
                .withArgs('referrer').returns('');

            sessionService.createSession(req, fakeRes(), function next(err) {
                should.equal(err instanceof BadRequestError, true);
                done();
            });
        });

        it('sets req.session.origin from the Referer header', function (done) {
            const req = fakeReq();
            const res = fakeRes();

            sandbox.stub(req, 'get')
                .withArgs('user-agent').returns('')
                .withArgs('origin').returns('')
                .withArgs('referrer').returns('http://ghost.org/path');

            req.ip = '127.0.0.1';
            req.user = models.User.forge({id: 23});

            sandbox.stub(res, 'sendStatus')
                .callsFake(function (statusCode) {
                    should.equal(req.session.origin, 'http://ghost.org');
                    done();
                });

            sessionService.createSession(req, res);
        });

        it('sets req.session.user_id,origin,user_agent,ip and calls sendStatus with 201 if the check succeeds', function (done) {
            const req = fakeReq();
            const res = fakeRes();

            sandbox.stub(req, 'get')
                .withArgs('origin').returns('http://host.tld')
                .withArgs('user-agent').returns('bububang');

            req.ip = '127.0.0.1';
            req.user = models.User.forge({id: 23});

            sandbox.stub(res, 'sendStatus')
                .callsFake(function (statusCode) {
                    should.equal(req.session.user_id, 23);
                    should.equal(req.session.origin, 'http://host.tld');
                    should.equal(req.session.user_agent, 'bububang');
                    should.equal(req.session.ip, '127.0.0.1');
                    should.equal(statusCode, 201);
                    done();
                });

            sessionService.createSession(req, res);
        });
    });

    describe('destroySession', function () {
        it('calls req.session.destroy', function () {
            const req = fakeReq();
            const res = fakeRes();
            const destroyStub = sandbox.stub(req.session, 'destroy');

            sessionService.destroySession(req, res);

            should.equal(destroyStub.callCount, 1);
        });

        it('calls next with InternalServerError if destroy errors', function (done) {
            const req = fakeReq();
            const res = fakeRes();
            sandbox.stub(req.session, 'destroy')
                .callsFake(function (fn) {
                    fn(new Error('oops'));
                });

            sessionService.destroySession(req, res, function next(err) {
                should.equal(err instanceof InternalServerError, true);
                done();
            });
        });

        it('calls sendStatus with 204 if destroy does not error', function (done) {
            const req = fakeReq();
            const res = fakeRes();
            sandbox.stub(req.session, 'destroy')
                .callsFake(function (fn) {
                    fn();
                });
            sandbox.stub(res, 'sendStatus')
                .callsFake(function (status) {
                    should.equal(status, 204);
                    done();
                });

            sessionService.destroySession(req, res);
        });
    });

    describe('getUser', function () {
        it('sets req.user to null and calls next if there is no session', function (done) {
            const req = fakeReq();
            const res = fakeRes();

            delete req.session;

            sessionService.getUser(req, res, function next() {
                should.equal(req.user, null);
                done();
            });
        });

        it('sets req.user to null and calls next if there is no session', function (done) {
            const req = fakeReq();
            const res = fakeRes();

            sessionService.getUser(req, res, function next() {
                should.equal(req.user, null);
                done();
            });
        });

        it('calls User.findOne with id set to req.session.user_id', function (done) {
            const req = fakeReq();
            const res = fakeRes();
            sandbox.stub(models.User, 'findOne')
                .callsFake(function (opts) {
                    should.equal(opts.id, 23);
                    done();
                });

            req.session.user_id = 23;
            sessionService.getUser(req, res);
        });

        it('sets req.user to null and calls next if the user is not found', function (done) {
            const req = fakeReq();
            const res = fakeRes();
            sandbox.stub(models.User, 'findOne')
                .rejects();

            req.session.user_id = 23;
            sessionService.getUser(req, res, function next() {
                should.equal(req.user, null);
                done();
            });
        });

        it('calls next after settign req.user to the found user', function (done) {
            const req = fakeReq();
            const res = fakeRes();
            const user = models.User.forge({id: 23});
            sandbox.stub(models.User, 'findOne')
                .resolves(user);

            req.session.user_id = 23;
            sessionService.getUser(req, res, function next() {
                should.equal(req.user, user);
                done();
            });
        });
    });

    describe('CSRF protection', function () {
        it('calls next if the session is uninitialized', function (done) {
            const req = fakeReq();
            const res = fakeRes();

            sessionService.cookieCsrfProtection(req, res, function next(err) {
                should.not.exist(err);
                done();
            });
        });

        it('calls next if req origin matches the session origin', function (done) {
            const req = fakeReq();
            const res = fakeRes();
            sandbox.stub(req, 'get')
                .withArgs('origin').returns('http://host.tld');
            req.session.origin = 'http://host.tld';

            sessionService.cookieCsrfProtection(req, res, function next(err) {
                should.not.exist(err);
                done();
            });
        });

        it('calls next with BadRequestError if the origin of req does not match the session', function (done) {
            const req = fakeReq();
            const res = fakeRes();
            sandbox.stub(req, 'get')
                .withArgs('origin').returns('http://host.tld');
            req.session.origin = 'http://different-host.tld';

            sessionService.cookieCsrfProtection(req, res, function next(err) {
                should.equal(err instanceof BadRequestError, true);
                done();
            });
        });
    });

    describe('safeGetSession', function () {
        it('is an array of getSession and cookieCsrfProtection', function () {
            should.deepEqual(sessionService.safeGetSession, [
                sessionService.getSession,
                sessionService.cookieCsrfProtection
            ]);
        });
    });
});
