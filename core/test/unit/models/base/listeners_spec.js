var should = require('should'),
    sinon = require('sinon'),
    rewire = require('rewire'),
    common = require('../../../../server/lib/common'),
    Models = require('../../../../server/models');

describe('Models: listeners', function () {
    var eventsToRemember = {};
    const emit = (event, data) => eventsToRemember[event](data);

    before(function () {
        sinon.stub(common.events, 'on').callsFake(function (name, callback) {
            eventsToRemember[name] = callback;
        });

        rewire('../../../../server/models/base/listeners');
        Models.init();
    });

    afterEach(function () {
        sinon.restore();
    });

    describe('on token added', function () {
        it('calls updateLastSeen on the user when the token.added event is emited', function (done) {
            const userId = 1;
            const user = Models.User.forge({id: 1});
            sinon.stub(Models.User, 'findOne').withArgs({id: userId}).resolves(user);
            const updateLastSeenSpy = sinon.stub(user, 'updateLastSeen').callsFake(function () {
                updateLastSeenSpy.calledOnce.should.be.true();
                done();
            });

            const fakeToken = {
                get: sinon.stub().withArgs('user_id').returns(userId)
            };

            emit('token.added', fakeToken);
        });
    });
});
