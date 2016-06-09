/*globals describe, before, afterEach, it*/
var should          = require('should'),
    sinon           = require('sinon'),
    sandbox         = sinon.sandbox.create(),
    events          = require('../../server/events'),
    Models          = require('../../server/models');

// To stop jshint complaining
should.equal(true, true);

describe('Model Events', function () {
    before(function () {
        // Loads all the models
        Models.init();
    });

    afterEach(function () {
        sandbox.restore();
    });

    describe('on token added', function () {
        it('calls User edit when event is emitted', function (done) {
            // Setup
            var userModelSpy = sandbox.spy(Models.User, 'edit');
            // Test
            events.emit('token.added', {get: function () { return 1; }});
            // Assert
            userModelSpy.calledOnce.should.be.true();
            userModelSpy.calledWith(
                sinon.match.has('last_login'),
                sinon.match.has('id')
            );

            done();
        });
    });
});
