var should = require('should'),
    sinon = require('sinon'),
    testUtils = require('../../utils'),
    common = require('../../../server/lib/common'),
    constants = require('../../../server/lib/constants'),

    // Stuff we are testing
    AccesstokenModel = require('../../../server/models/accesstoken').Accesstoken,

    sandbox = sinon.sandbox.create();

describe('Accesstoken Model', function () {
    // Keep the DB clean
    before(testUtils.teardown);
    afterEach(testUtils.teardown);

    afterEach(function () {
        sandbox.restore();
    });

    beforeEach(testUtils.setup('users:roles', 'clients'));

    it('on creation emits token.added event', function (done) {
        // Setup
        var eventSpy = sandbox.spy(common.events, 'emit');

        // Test
        // Stub refreshtoken
        AccesstokenModel.add({
            token: 'foobartoken',
            user_id: testUtils.DataGenerator.Content.users[0].id,
            client_id: testUtils.DataGenerator.forKnex.clients[0].id,
            expires: Date.now() + constants.ONE_MONTH_MS
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
