const should = require('should');
const sinon = require('sinon');
const updateUserLastSeenMiddleware = require('../../../../server/web/shared/middlewares').updateUserLastSeen;

describe('updateUserLastSeenMiddleware', function () {
    let sandbox;

    before(function () {
        sandbox = sinon.sandbox.create();
    });

    afterEach(function () {
        sandbox.restore();
    });

    it('calls next with no error if there is no user on the request', function (done) {
        updateUserLastSeenMiddleware({}, {}, function next(err) {
            should.equal(err, undefined);
            done();
        });
    });

    it('calls updateLastSeen on the req.user, calling next with nothing if success', function (done) {
        const fakeUser = {
            updateLastSeen: sandbox.stub().resolves()
        };
        updateUserLastSeenMiddleware({user: fakeUser}, {}, function next(err) {
            should.equal(err, undefined);
            should.equal(fakeUser.updateLastSeen.callCount, 1);
            done();
        });
    });

    it('calls updateLastSeen on the req.user, calling next with err if error', function (done) {
        const fakeError = new Error('gonna need a bigger boat');
        const fakeUser = {
            updateLastSeen: sandbox.stub().rejects(fakeError)
        };
        updateUserLastSeenMiddleware({user: fakeUser}, {}, function next(err) {
            should.equal(err, fakeError);
            should.equal(fakeUser.updateLastSeen.callCount, 1);
            done();
        });
    });
});
