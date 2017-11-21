var _ = require('lodash'),
    should = require('should'),
    sinon = require('sinon'),
    rewire = require('rewire'),
    testUtils = require('../../utils'),

    // Stuff we test
    webhooks = rewire('../../../server/services/webhooks'),
    events = require('../../../server/events'),

    sandbox = sinon.sandbox.create();

describe('Webhooks', function () {
    var eventStub;

    beforeEach(function () {
        eventStub = sandbox.stub(events, 'on');
    });

    afterEach(function () {
        sandbox.restore();
    });

    it('listen() should initialise events correctly', function () {
        webhooks.listen();
        eventStub.calledTwice.should.be.true();
    });

    it('listener() with "subscriber.added" event calls api.webhooks.trigger with toJSONified model', function () {
        var testSubscriber = _.clone(testUtils.DataGenerator.Content.subscribers[0]),
            testModel = {
                toJSON: function () {
                    return testSubscriber;
                }
            },
            apiStub = {
                webhooks: {
                    trigger: sandbox.stub()
                }
            },
            resetWebhooks = webhooks.__set__('api', apiStub),
            listener = webhooks.__get__('listener'),
            triggerArgs;

        listener('subscriber.added', testModel);

        apiStub.webhooks.trigger.calledOnce.should.be.true();

        triggerArgs = apiStub.webhooks.trigger.getCall(0).args;
        triggerArgs[0].should.eql('subscriber.added');
        triggerArgs[1].should.deepEqual({
            subscribers: [testSubscriber]
        });

        resetWebhooks();
    });

    it('listener() with "subscriber.deleted" event calls api.webhooks.trigger with _previousAttributes values', function () {
        var testSubscriber = _.clone(testUtils.DataGenerator.Content.subscribers[1]),
            testModel = {
                _previousAttributes: testSubscriber
            },
            apiStub = {
                webhooks: {
                    trigger: sandbox.stub()
                }
            },
            resetWebhooks = webhooks.__set__('api', apiStub),
            listener = webhooks.__get__('listener'),
            triggerArgs;

        listener('subscriber.deleted', testModel);

        apiStub.webhooks.trigger.calledOnce.should.be.true();

        triggerArgs = apiStub.webhooks.trigger.getCall(0).args;
        triggerArgs[0].should.eql('subscriber.deleted');
        triggerArgs[1].should.deepEqual({
            subscribers: [testSubscriber]
        });

        resetWebhooks();
    });
});
