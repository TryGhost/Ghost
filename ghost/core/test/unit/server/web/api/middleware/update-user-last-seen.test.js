const assert = require('node:assert/strict');
const {promisify} = require('node:util');
const sinon = require('sinon');
const moment = require('moment');
const updateUserLastSeenMiddleware = require('../../../../../../core/server/web/api/middleware/update-user-last-seen');

const updateUserLastSeen = promisify(updateUserLastSeenMiddleware);

describe('updateUserLastSeenMiddleware', function () {
    afterEach(function () {
        sinon.restore();
    });

    it('calls next with no error if there is no user on the request', async function () {
        await updateUserLastSeen({}, {});
    });

    it('calls next with no error if the current last_seen is less than an hour before now', async function () {
        const fakeLastSeen = new Date();
        const fakeUser = {
            get: sinon.stub().withArgs('last_seen').returns(fakeLastSeen)
        };
        await updateUserLastSeen({user: fakeUser}, {});
    });

    describe('when the last_seen is longer than an hour ago', function () {
        it('calls updateLastSeen on the req.user, calling next with nothing if success', async function () {
            const fakeLastSeen = moment().subtract(1, 'hours').toDate();
            const fakeUser = {
                get: sinon.stub().withArgs('last_seen').returns(fakeLastSeen),
                updateLastSeen: sinon.stub().resolves()
            };
            await updateUserLastSeen({user: fakeUser}, {});

            sinon.assert.calledOnce(fakeUser.updateLastSeen);
        });

        it('calls updateLastSeen on the req.user, calling next with err if error', async function () {
            const fakeLastSeen = moment().subtract(1, 'hours').toDate();
            const fakeError = new Error('gonna need a bigger boat');
            const fakeUser = {
                get: sinon.stub().withArgs('last_seen').returns(fakeLastSeen),
                updateLastSeen: sinon.stub().rejects(fakeError)
            };

            await assert.rejects(
                updateUserLastSeen({user: fakeUser}, {}),
                (err) => {
                    assert.equal(err, fakeError);
                    return true;
                }
            );

            sinon.assert.calledOnce(fakeUser.updateLastSeen);
        });
    });
});
