const _ = require('lodash');
const should = require('should');
const assert = require('assert');
const sinon = require('sinon');
const rewire = require('rewire');
const testUtils = require('../../utils');
const common = require('../../../server/lib/common');
    // Stuff we test
const webhooks = {
    listen: rewire('../../../server/services/webhooks/listen'),
    trigger: rewire('../../../server/services/webhooks/trigger')
};

const sandbox = sinon.sandbox.create();

describe('Webhooks', function () {
    var eventStub;

    beforeEach(function () {
        eventStub = sandbox.stub(common.events, 'on');
    });

    afterEach(function () {
        sandbox.restore();
    });

    it('listen() should initialise events correctly', function () {
        webhooks.listen();
        assert.equal(eventStub.callCount, 6);
    });

    it('listener() with "subscriber.added" event calls webhooks.trigger with toJSONified model', function () {
        var testSubscriber = _.clone(testUtils.DataGenerator.Content.subscribers[0]),
            testModel = {
                toJSON: function () {
                    return testSubscriber;
                }
            },
            webhooksStub = {
                trigger: sandbox.stub()
            },
            resetWebhooks = webhooks.listen.__set__('webhooks', webhooksStub),
            listener = webhooks.listen.__get__('listener'),
            triggerArgs;

        listener('subscriber.added', testModel);

        webhooksStub.trigger.calledOnce.should.be.true();

        triggerArgs = webhooksStub.trigger.getCall(0).args;
        triggerArgs[0].should.eql('subscriber.added');
        triggerArgs[1].should.deepEqual({
            subscribers: [testSubscriber],
            event: 'subscriber.added'
        });

        resetWebhooks();
    });

    it('listener() with "subscriber.deleted" event calls webhooks.trigger with _previousAttributes values', function () {
        var testSubscriber = _.clone(testUtils.DataGenerator.Content.subscribers[1]),
            testModel = {
                _previousAttributes: testSubscriber
            },
            webhooksStub = {
                trigger: sandbox.stub()
            },
            resetWebhooks = webhooks.listen.__set__('webhooks', webhooksStub),
            listener = webhooks.listen.__get__('listener'),
            triggerArgs;

        listener('subscriber.deleted', testModel);

        webhooksStub.trigger.calledOnce.should.be.true();

        triggerArgs = webhooksStub.trigger.getCall(0).args;
        triggerArgs[0].should.eql('subscriber.deleted');
        triggerArgs[1].should.deepEqual({
            subscribers: [testSubscriber],
            event: 'subscriber.deleted'
        });

        resetWebhooks();
    });

    it('listener() with "site.changed" event calls webhooks.trigger ', function () {
        const webhooksStub = {
            trigger: sandbox.stub()
        };
        const resetWebhooks = webhooks.listen.__set__('webhooks', webhooksStub);
        const listener = webhooks.listen.__get__('listener');
        let triggerArgs;

        listener('site.changed');

        webhooksStub.trigger.calledOnce.should.be.true();

        triggerArgs = webhooksStub.trigger.getCall(0).args;
        triggerArgs[0].should.eql('site.changed');
        triggerArgs[1].should.eql({
            event: 'site.changed'
        });

        resetWebhooks();
    });

    it('listener() with "post.published" event calls webhooks.trigger with toJSONified model', function () {
        var testPost = _.clone(testUtils.DataGenerator.Content.posts[1]),
            testModel = {
                toJSON: function () {
                    return testPost;
                }
            },
            webhooksStub = {
                trigger: sandbox.stub()
            },
            resetWebhooks = webhooks.listen.__set__('webhooks', webhooksStub),
            listener = webhooks.listen.__get__('listener'),
            triggerArgs;

        listener('post.published', testModel);

        webhooksStub.trigger.calledOnce.should.be.true();

        triggerArgs = webhooksStub.trigger.getCall(0).args;
        triggerArgs[0].should.eql('post.published');
        triggerArgs[1].should.deepEqual({
            posts: [testPost],
            event: 'post.published'
        });

        resetWebhooks();
    });

    it('listener() with "post.unpublished" event calls webhooks.trigger with toJSONified model', function () {
        var testPost = _.clone(testUtils.DataGenerator.Content.posts[1]),
            testModel = {
                toJSON: function () {
                    return testPost;
                }
            },
            webhooksStub = {
                trigger: sandbox.stub()
            },
            resetWebhooks = webhooks.listen.__set__('webhooks', webhooksStub),
            listener = webhooks.listen.__get__('listener'),
            triggerArgs;

        listener('post.unpublished', testModel);

        webhooksStub.trigger.calledOnce.should.be.true();

        triggerArgs = webhooksStub.trigger.getCall(0).args;
        triggerArgs[0].should.eql('post.unpublished');
        triggerArgs[1].should.deepEqual({
            posts: [testPost],
            event: 'post.unpublished'
        });

        resetWebhooks();
    });

    it('listener() with "post.published.edited" event calls webhooks.trigger with toJSONified model', function () {
        var testPost = _.clone(testUtils.DataGenerator.Content.posts[1]),
            testModel = {
                toJSON: function () {
                    return testPost;
                }
            },
            webhooksStub = {
                trigger: sandbox.stub()
            },
            resetWebhooks = webhooks.listen.__set__('webhooks', webhooksStub),
            listener = webhooks.listen.__get__('listener'),
            triggerArgs;

        listener('post.published.edited', testModel);

        webhooksStub.trigger.calledOnce.should.be.true();

        triggerArgs = webhooksStub.trigger.getCall(0).args;
        triggerArgs[0].should.eql('post.published.edited');
        triggerArgs[1].should.deepEqual({
            posts: [testPost],
            event: 'post.published.edited'
        });

        resetWebhooks();
    });
});
