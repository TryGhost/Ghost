var should = require('should'), // jshint ignore:line
    sinon = require('sinon'),
    rewire = require('rewire'),
    common = require('../../../../server/lib/common'),
    Models = require('../../../../server/models'),

    sandbox = sinon.sandbox.create();

describe('Models: listeners', function () {
    var eventsToRemember = {};

    before(function () {
        sandbox.stub(common.events, 'on').callsFake(function (name, callback) {
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

            eventsToRemember['token.added']({
                get: function () {
                    return 1;
                }
            });

            userModelSpy.calledOnce.should.be.true();
            userModelSpy.calledWith(
                sinon.match.has('last_seen'),
                sinon.match.has('id')
            );

            done();
        });
    });
});
