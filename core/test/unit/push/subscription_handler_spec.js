/*globals describe, beforeEach, afterEach, it*/
var should                  = require('should'),
    sinon                   = require('sinon'),
    rewire                  = require('rewire'),
    Promise                 = require('bluebird'),

    pushSubscriptionHandler = rewire('../../../server/push/subscription-handler');

describe('PuSH Subscription Handler', function () {
    var callbackUrl = 'http://www.example.com',
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
        res.status = sandbox.stub().returns(res);
        next = sandbox.spy();

        pushSubscriptionHandler.__set__('dataProvider', dataProvider);
    });

    afterEach(function () {
        sandbox.restore();
    });

    it('should create a new subscriber', function () {
        dataProvider.PushSubscriber.add
            .withArgs({ callback_url: callbackUrl })
            .returns(Promise.resolve());

        req.body['hub.mode'] = 'subscribe';
        req.body['hub.callback'] = callbackUrl;

        pushSubscriptionHandler(req, res, next).then(function () {
            res.status.calledWith(202).should.be.true();
            res.end.called.should.be.true();
        });
    });

    it('should delete an existing subscriber', function () {
        var subscriberId = 1;

        dataProvider.PushSubscriber.findOne
            .withArgs({ callback_url: callbackUrl })
            .returns(Promise.resolve({ attributes: { id: subscriberId }}));

        dataProvider.PushSubscriber.destroy
            .withArgs({ id: subscriberId })
            .returns(Promise.resolve());

        req.body['hub.mode'] = 'unsubscribe';
        req.body['hub.callback'] = callbackUrl;

        pushSubscriptionHandler(req, res, next).then(function () {
            res.status.calledWith(202).should.be.true();
            res.end.called.should.be.true();
        });
    });
});
