const should = require('should');
const sinon = require('sinon');
const constants = require('@tryghost/constants');
const updateUserLastSeenMiddleware = require('../../../../../../core/server/web/api/middleware/update-user-last-seen');

describe('updateUserLastSeenMiddleware', function () {
    afterEach(function () {
        sinon.restore();
    });

    it('calls next with no error if there is no user on the request', function (done) {
        updateUserLastSeenMiddleware({}, {}, function next(err) {
            should.equal(err, undefined);
            done();
        });
    });

    it('calls next with no error if the current last_seen is less than an hour before now', function (done) {
        const fakeLastSeen = new Date();
        const fakeUser = {
            get: sinon.stub().withArgs('last_seen').returns(fakeLastSeen)
        };
        updateUserLastSeenMiddleware({user: fakeUser}, {}, function next(err) {
            should.equal(err, undefined);
            done();
        });
    });

    describe('when the last_seen is longer than an hour ago', function () {
        it('calls updateLastSeen on the req.user, calling next with nothing if success', function (done) {
            const fakeLastSeen = new Date(Date.now() - constants.ONE_HOURS_MS);
            const fakeUser = {
                get: sinon.stub().withArgs('last_seen').returns(fakeLastSeen),
                updateLastSeen: sinon.stub().resolves()
            };
            updateUserLastSeenMiddleware({user: fakeUser}, {}, function next(err) {
                should.equal(err, undefined);
                should.equal(fakeUser.updateLastSeen.callCount, 1);
                done();
            });
        });

        it('calls updateLastSeen on the req.user, calling next with err if error', function (done) {
            const fakeLastSeen = new Date(Date.now() - constants.ONE_HOURS_MS);
            const fakeError = new Error('gonna need a bigger boat');
            const fakeUser = {
                get: sinon.stub().withArgs('last_seen').returns(fakeLastSeen),
                updateLastSeen: sinon.stub().rejects(fakeError)
            };
            updateUserLastSeenMiddleware({user: fakeUser}, {}, function next(err) {
                should.equal(err, fakeError);
                should.equal(fakeUser.updateLastSeen.callCount, 1);
                done();
            });
        });
    });
});
