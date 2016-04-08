/*globals describe, beforeEach, afterEach, it*/
var should                  = require('should'),
    sinon                   = require('sinon'),
    rewire                  = require('rewire'),
    Promise                 = require('bluebird'),

    pushSubscriptionHandler = rewire('../../../server/push/subscription-handler');

describe('PuSH Subscription Handler', function () {
    var callbackUrl = 'http://www.example.com',
        topicUrl = 'http://www.example.com/rss',
        sandbox, dataProvider, req, res, next;

    beforeEach(function () {
        sandbox = sinon.sandbox.create();
        dataProvider = {
            PushSubscriber: {
                add: sandbox.stub(),
                findOne: sandbox.stub(),
                destroy: sandbox.stub()
            }
        };
        req = {};
        req.body = {};
        res = {};
        res.end = sandbox.spy();
        res.send = sandbox.spy();
        res.status = sandbox.stub().returns(res);
        next = sandbox.spy();

        pushSubscriptionHandler.__set__('dataProvider', dataProvider);
    });

    afterEach(function () {
        sandbox.restore();
    });

    it('should create a new subscriber', function () {
        dataProvider.PushSubscriber.add
            .withArgs({ callback_url: callbackUrl, topic_url: topicUrl })
            .returns(Promise.resolve());

        req.body['hub.mode'] = 'subscribe';
        req.body['hub.callback'] = callbackUrl;
        req.body['hub.topic'] = topicUrl;

        return pushSubscriptionHandler(req, res, next).then(function () {
            res.status.calledWith(202).should.be.true();
            res.end.called.should.be.true();
        });
    });

    it('should delete an existing subscriber', function () {
        var subscriberId = 1;

        dataProvider.PushSubscriber.findOne
            .withArgs({ callback_url: callbackUrl, topic_url: topicUrl })
            .returns(Promise.resolve({ attributes: { id: subscriberId }}));

        dataProvider.PushSubscriber.destroy
            .withArgs({ id: subscriberId })
            .returns(Promise.resolve());

        req.body['hub.mode'] = 'unsubscribe';
        req.body['hub.callback'] = callbackUrl;
        req.body['hub.topic'] = topicUrl;

        return pushSubscriptionHandler(req, res, next).then(function () {
            res.status.calledWith(202).should.be.true();
            res.end.called.should.be.true();
        });
    });

    it('should send a 500 error if it fails find an existing subscriber to delete', function () {
        dataProvider.PushSubscriber.findOne
            .withArgs({ callback_url: callbackUrl, topic_url: topicUrl })
            .returns(Promise.resolve(null));

        req.body['hub.mode'] = 'unsubscribe';
        req.body['hub.callback'] = callbackUrl;
        req.body['hub.topic'] = topicUrl;

        return pushSubscriptionHandler(req, res, next).then(function () {
            res.status.calledWith(500).should.be.true();
            res.send.calledWith('Subscription modification failed').should.be.true();
        });
    });
});
