var testUtils   = require('../../utils'),
    should      = require('should'),
    events      = require('../../../server/events'),
    utils       = require('../../../server/utils'),

    sinon           = require('sinon'),
    sandbox         = sinon.sandbox.create(),
    // Stuff we are testing
    AccesstokenModel   = require('../../../server/models/accesstoken').Accesstoken;

describe('Accesstoken Model', function () {
    // Keep the DB clean
    before(testUtils.teardown);
    afterEach(testUtils.teardown);

    afterEach(function () {
        sandbox.restore();
    });

    beforeEach(testUtils.setup('users', 'clients'));

    it('on creation emits token.added event', function (done) {
        // Setup
        var eventSpy = sandbox.spy(events, 'emit');
        // Test
        // Stub refreshtoken
        AccesstokenModel.add({
            token: 'foobartoken',
            user_id: 1,
            client_id: 1,
            expires: Date.now() + utils.ONE_HOUR_MS
        })
        .then(function (token) {
            should.exist(token);
            // Assert
            eventSpy.calledOnce.should.be.true();
            eventSpy.calledWith('token.added').should.be.true();

            done();
        }).catch(done);
    });
});
