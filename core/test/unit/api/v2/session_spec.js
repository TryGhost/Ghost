const should = require('should');
const sinon = require('sinon');

const models = require('../../../../server/models');
const {UnauthorizedError} = require('../../../../server/lib/common/errors');

const sessionController = require('../../../../server/api/v2/session');
const sessionServiceMiddleware = require('../../../../server/services/auth/session/middleware');

describe('Session controller', function () {
    let sandbox;

    before(function () {
        models.init();
        sandbox = sinon.sandbox.create();
    });

    afterEach(function () {
        sandbox.restore();
    });

    it('exports an add method', function () {
        should.equal(typeof sessionController.add, 'function');
    });
    it('exports an delete method', function () {
        should.equal(typeof sessionController.delete, 'function');
    });

    describe('#add', function () {
        it('throws an UnauthorizedError if the object is missing a username and password', function () {
            return sessionController.add({}).then(() => {
                should.fail('session.add did not throw');
            },(err) => {
                should.equal(err instanceof UnauthorizedError, true);
            });
        });

        it('it checks the username and password and throws UnauthorizedError if it fails', function () {
            const userCheckStub = sandbox.stub(models.User, 'check')
                .rejects(new Error());

            return sessionController.add({
                username: 'freddy@vodafone.com',
                password: 'qu33nRul35'
            }, {}).then(() => {
                should.fail('session.add did not throw');
            },(err) => {
                should.equal(err instanceof UnauthorizedError, true);
            });
        });

        it('it returns a function that sets req.user and calls createSession if the check works', function () {
            const fakeReq = {};
            const fakeRes = {};
            const fakeNext = () => {};
            const fakeUser = models.User.forge({});
            sandbox.stub(models.User, 'check')
                .resolves(fakeUser);

            const createSessionStub = sandbox.stub(sessionServiceMiddleware, 'createSession');

            return sessionController.add({
                username: 'freddy@vodafone.com',
                password: 'qu33nRul35'
            }, {}).then((fn) => {
                fn(fakeReq, fakeRes, fakeNext);
            }).then(function () {
                const createSessionStubCall = createSessionStub.getCall(0);
                should.equal(fakeReq.user, fakeUser);
                should.equal(createSessionStubCall.args[0], fakeReq);
                should.equal(createSessionStubCall.args[1], fakeRes);
                should.equal(createSessionStubCall.args[2], fakeNext);
            });
        });
    });

    describe('#delete', function () {
        it('returns a function that calls destroySession', function () {
            const fakeReq = {};
            const fakeRes = {};
            const fakeNext = () => {};
            const destroySessionStub = sandbox.stub(sessionServiceMiddleware, 'destroySession');

            return sessionController.delete().then((fn) => {
                fn(fakeReq, fakeRes, fakeNext);
            }).then(function () {
                const destroySessionStubCall = destroySessionStub.getCall(0);
                should.equal(destroySessionStubCall.args[0], fakeReq);
                should.equal(destroySessionStubCall.args[1], fakeRes);
                should.equal(destroySessionStubCall.args[2], fakeNext);
            });
        });
    });

    describe('#get', function () {
        it('returns the result of User.findOne', function () {
            const findOneReturnVal = new Promise(() => {});
            const findOneStub = sandbox.stub(models.User, 'findOne')
                .returns(findOneReturnVal);

            const result = sessionController.read({
                context: {
                    user: 108
                }
            });
            should.equal(result, findOneReturnVal);
            should.deepEqual(findOneStub.args[0][0], {
                id: 108
            });
        });
    });
});
