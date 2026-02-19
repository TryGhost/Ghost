const assert = require('node:assert/strict');
const sinon = require('sinon');
const {UnauthorizedError} = require('@tryghost/errors');

const models = require('../../../../core/server/models');

const sessionController = require('../../../../core/server/api/endpoints/session');
const sessionServiceMiddleware = require('../../../../core/server/services/auth/session');

describe('Session controller', function () {
    before(function () {
        models.init();
    });

    afterEach(function () {
        sinon.restore();
    });

    it('exports an add method', function () {
        assert.equal(typeof sessionController.add, 'function');
    });
    it('exports an delete method', function () {
        assert.equal(typeof sessionController.delete, 'function');
    });

    describe('#add', function () {
        it('throws an UnauthorizedError if the object is missing a username and password', function () {
            return sessionController.add({}).then(() => {
                assert.fail('session.add did not throw');
            },(err) => {
                assert.equal(err instanceof UnauthorizedError, true);
            });
        });

        it('it checks the username and password and throws UnauthorizedError if it fails', function () {
            sinon.stub(models.User, 'check')
                .rejects(new Error());

            return sessionController.add({
                username: 'freddy@vodafone.com',
                password: 'qu33nRul35'
            }, {}).then(() => {
                assert.fail('session.add did not throw');
            },(err) => {
                assert.equal(err instanceof UnauthorizedError, true);
            });
        });

        it('it returns a function that calls req.brute.reset, sets req.user and calls createSession if the check works', function () {
            const fakeReq = {
                brute: {
                    reset: sinon.stub().callsArg(0)
                }
            };
            const fakeRes = {};
            const fakeNext = () => {};
            const fakeUser = models.User.forge({});
            sinon.stub(models.User, 'check')
                .resolves(fakeUser);
            sinon.stub(models.User, 'getByEmail')
                .resolves(fakeUser);

            const createSessionStub = sinon.stub(sessionServiceMiddleware, 'createSession');

            return sessionController.add({data: {
                username: 'freddy@vodafone.com',
                password: 'qu33nRul35'
            }}).then((fn) => {
                fn(fakeReq, fakeRes, fakeNext);
            }).then(function () {
                assert.equal(fakeReq.brute.reset.callCount, 1);

                const createSessionStubCall = createSessionStub.getCall(0);
                assert.equal(fakeReq.user, fakeUser);
                assert.equal(createSessionStubCall.args[0], fakeReq);
                assert.equal(createSessionStubCall.args[1], fakeRes);
                assert.equal(createSessionStubCall.args[2], fakeNext);
            });
        });

        it('it returns a function that calls req.brute.reset and calls next if reset errors', function () {
            const resetError = new Error();
            const fakeReq = {
                brute: {
                    reset: sinon.stub().callsArgWith(0, resetError)
                }
            };
            const fakeRes = {};
            const fakeNext = sinon.stub();
            const fakeUser = models.User.forge({});
            sinon.stub(models.User, 'check')
                .resolves(fakeUser);
            sinon.stub(models.User, 'getByEmail')
                .resolves(fakeUser);

            sinon.stub(sessionServiceMiddleware, 'createSession');

            return sessionController.add({data: {
                username: 'freddy@vodafone.com',
                password: 'qu33nRul35'
            }}).then((fn) => {
                fn(fakeReq, fakeRes, fakeNext);
            }).then(function () {
                assert.equal(fakeReq.brute.reset.callCount, 1);
                assert.equal(fakeNext.callCount, 1);
                assert.equal(fakeNext.args[0][0], resetError);
            });
        });

        it('it creates a verified session when the user has not logged in before', function () {
            const fakeReq = {
                brute: {
                    reset: sinon.stub().callsArg(0)
                }
            };
            const fakeRes = {};
            const fakeNext = () => {};
            const fakeUser = models.User.forge({});
            sinon.stub(models.User, 'check')
                .resolves(fakeUser);
            sinon.stub(models.User, 'getByEmail')
                .resolves(fakeUser);

            const createSessionStub = sinon.stub(sessionServiceMiddleware, 'createSession');

            return sessionController.add({data: {
                username: 'freddy@vodafone.com',
                password: 'qu33nRul35'
            }}).then((fn) => {
                fn(fakeReq, fakeRes, fakeNext);
            }).then(function () {
                assert.equal(fakeReq.brute.reset.callCount, 1);

                const createSessionStubCall = createSessionStub.getCall(0);
                assert.equal(fakeReq.user, fakeUser);
                assert.equal(createSessionStubCall.args[0], fakeReq);
                assert.equal(createSessionStubCall.args[1], fakeRes);
                assert.equal(createSessionStubCall.args[2], fakeNext);

                assert.equal(fakeReq.skipVerification, true);
            });
        });

        it('it creates a non-verified session when the user has logged in before', function () {
            const fakeReq = {
                brute: {
                    reset: sinon.stub().callsArg(0)
                }
            };
            const fakeRes = {};
            const fakeNext = () => {};
            const fakeUser = models.User.forge({last_seen: new Date()});
            sinon.stub(models.User, 'check')
                .resolves(fakeUser);
            sinon.stub(models.User, 'getByEmail')
                .resolves(fakeUser);

            const createSessionStub = sinon.stub(sessionServiceMiddleware, 'createSession');

            return sessionController.add({data: {
                username: 'freddy@vodafone.com',
                password: 'qu33nRul35'
            }}).then((fn) => {
                fn(fakeReq, fakeRes, fakeNext);
            }).then(function () {
                assert.equal(fakeReq.brute.reset.callCount, 1);

                const createSessionStubCall = createSessionStub.getCall(0);
                assert.equal(fakeReq.user, fakeUser);
                assert.equal(createSessionStubCall.args[0], fakeReq);
                assert.equal(createSessionStubCall.args[1], fakeRes);
                assert.equal(createSessionStubCall.args[2], fakeNext);

                assert.equal(fakeReq.skipVerification, false);
            });
        });
    });

    describe('#delete', function () {
        it('returns a function that calls destroySession', function () {
            const fakeReq = {};
            const fakeRes = {};
            const fakeNext = () => {};
            const logoutSessionStub = sinon.stub(sessionServiceMiddleware, 'logout');

            return sessionController.delete().then((fn) => {
                fn(fakeReq, fakeRes, fakeNext);
            }).then(function () {
                const destroySessionStubCall = logoutSessionStub.getCall(0);
                assert.equal(destroySessionStubCall.args[0], fakeReq);
                assert.equal(destroySessionStubCall.args[1], fakeRes);
                assert.equal(destroySessionStubCall.args[2], fakeNext);
            });
        });
    });
});
