const sessionMiddleware = require('../../../../../../core/server/services/auth').session;
const models = require('../../../../../../core/server/models');
const sinon = require('sinon');
const should = require('should');

describe('Session Service', function () {
    before(function () {
        models.init();
    });

    afterEach(function () {
        sinon.restore();
    });

    const fakeReq = function fakeReq() {
        return {
            session: {
                destroy() {}
            },
            user: null,
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
        it('sets req.session.origin from the Referer header', function (done) {
            const req = fakeReq();
            const res = fakeRes();

            sinon.stub(req, 'get')
                .withArgs('user-agent').returns('')
                .withArgs('origin').returns('')
                .withArgs('referrer').returns('http://ghost.org/path');

            req.ip = '127.0.0.1';
            req.user = models.User.forge({id: 23});

            sinon.stub(res, 'sendStatus')
                .callsFake(function () {
                    should.equal(req.session.origin, 'http://ghost.org');
                    done();
                });

            sessionMiddleware.createSession(req, res);
        });

        it('sets req.session.user_id,origin,user_agent,ip and calls sendStatus with 201 if the check succeeds', function (done) {
            const req = fakeReq();
            const res = fakeRes();

            sinon.stub(req, 'get')
                .withArgs('origin').returns('http://host.tld')
                .withArgs('user-agent').returns('bububang');

            req.ip = '127.0.0.1';
            req.user = models.User.forge({id: 23});

            sinon.stub(res, 'sendStatus')
                .callsFake(function (statusCode) {
                    should.equal(req.session.user_id, 23);
                    should.equal(req.session.origin, 'http://host.tld');
                    should.equal(req.session.user_agent, 'bububang');
                    should.equal(req.session.ip, '127.0.0.1');
                    should.equal(statusCode, 201);
                    done();
                });

            sessionMiddleware.createSession(req, res);
        });
    });

    describe('destroySession', function () {
        it('calls req.session.destroy', function (done) {
            const req = fakeReq();
            const res = fakeRes();
            const destroyStub = sinon.stub(req.session, 'destroy')
                .callsFake(function (fn) {
                    fn();
                });

            sinon.stub(res, 'sendStatus')
                .callsFake(function () {
                    should.equal(destroyStub.callCount, 1);
                    done();
                });

            sessionMiddleware.destroySession(req, res);
        });

        it('calls next with InternalServerError if destroy errors', function (done) {
            const req = fakeReq();
            const res = fakeRes();
            sinon.stub(req.session, 'destroy')
                .callsFake(function (fn) {
                    fn(new Error('oops'));
                });

            sessionMiddleware.destroySession(req, res, function next(err) {
                should.equal(err.errorType, 'InternalServerError');
                done();
            });
        });

        it('calls sendStatus with 204 if destroy does not error', function (done) {
            const req = fakeReq();
            const res = fakeRes();
            sinon.stub(req.session, 'destroy')
                .callsFake(function (fn) {
                    fn();
                });
            sinon.stub(res, 'sendStatus')
                .callsFake(function (status) {
                    should.equal(status, 204);
                    done();
                });

            sessionMiddleware.destroySession(req, res);
        });
    });
});
