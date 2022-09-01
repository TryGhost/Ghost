// Switch these lines once there are useful utils
// const testUtils = require('./utils');
require('./utils');

const updateUserLastSeenMiddleware = require('../');

class UserMock {
    constructor(initialProps) {
        this._props = initialProps;
    }

    get(property) {
        return this._props[property];
    }

    updateLastSeen() {
        this._props.last_seen = Date.now();
        return Promise.resolve();
    }
}

describe('Update User Last Seen Middleware', function () {
    it('Does nothing when no user exists', function (done) {
        updateUserLastSeenMiddleware({}, undefined, () => {
            done();
        });
    });

    it('Does nothing when user last seen in future', function (done) {
        const lastSeen = Date.now() + 10 * 1000;
        const user = new UserMock({
            last_seen: lastSeen
        });

        updateUserLastSeenMiddleware({user}, undefined, () => {
            user.get('last_seen').should.equal(lastSeen);
            done();
        });
    });

    it('Does nothing when user last seen less than 1 hour ago', function (done) {
        const lastSeen = Date.now() - 59 * 60 * 1000;
        const user = new UserMock({
            last_seen: lastSeen
        });

        updateUserLastSeenMiddleware({user}, undefined, () => {
            user.get('last_seen').should.equal(lastSeen);
            done();
        });
    });

    it('Sets the last seen when the user last seen over 1 hour ago', function (done) {
        const lastSeen = Date.now() - 61 * 60 * 1000;
        const user = new UserMock({
            last_seen: lastSeen
        });

        updateUserLastSeenMiddleware({user}, undefined, () => {
            user.get('last_seen').should.not.equal(lastSeen);
            done();
        });
    });
});
