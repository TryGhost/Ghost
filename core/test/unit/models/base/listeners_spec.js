var should          = require('should'),
    sinon           = require('sinon'),
    rewire          = require('rewire'),
    sandbox         = sinon.sandbox.create(),
    events          = require('../../../../server/events/index'),
    Models          = require('../../../../server/models/index');

// To stop jshint complaining
should.equal(true, true);

describe('Models: listeners', function () {
    var eventsToRemember = {};

    before(function () {
        sandbox.stub(events, 'on', function (name, callback) {
            eventsToRemember[name] = callback;
        });

        rewire('../../../../server/models/base/listeners');
        Models.init();
    });

    afterEach(function () {
        sandbox.restore();
    });

    describe('on token added', function () {
        it('calls User edit when event is emitted', function (done) {
            var userModelSpy = sandbox.spy(Models.User, 'edit');

            eventsToRemember['token.added']({get: function () { return 1; }});

            userModelSpy.calledOnce.should.be.true();
            userModelSpy.calledWith(
                sinon.match.has('last_login'),
                sinon.match.has('id')
            );

            done();
        });
    });
});
