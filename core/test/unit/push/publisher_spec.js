/*globals describe, beforeEach, afterEach, it*/
var should        = require('should'),
    sinon         = require('sinon'),
    rewire        = require('rewire'),

    pushPublisher = rewire('../../../server/push/publisher');

describe('PuSH Publisher', function () {
    var sandbox, events, notifySubscribers;

    beforeEach(function () {
        sandbox = sinon.sandbox.create();

        events = {
            on: sinon.sandbox.spy()
        };

        notifySubscribers = sinon.sandbox.spy();

        pushPublisher.__set__({
            events: events,
            notifySubscribers: notifySubscribers
        });

        pushPublisher.init();
    });

    afterEach(function () {
        sandbox.restore();
    });

    it('should listen to the post models publish event and trigger subscriber notifications', function () {
        events.on.calledWith('post.published', notifySubscribers).should.be.true();
    });
});
