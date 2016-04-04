/*globals describe, beforeEach, afterEach, it*/
var should            = require('should'),
    sinon             = require('sinon'),
    rewire            = require('rewire'),
    Promise           = require('bluebird'),

    notifySubscribers = rewire('../../../server/push/subscriber-notifier');

describe('PuSH Subscriber Notifier', function () {
    var sandbox, axios, dataProvider, config,
        pushSubscribers, axiosReqParams, axiosSuccessRes, axiosFailureRes;

    beforeEach(function () {
        sandbox = sinon.sandbox.create();

        axios = {
            post: sinon.sandbox.stub()
        };

        dataProvider = {
            PushSubscriber: {
                findAll: sinon.sandbox.stub()
            }
        };

        config = {
            PuSH: {
                notificationRetryAttempts: 3
            }
        };

        pushSubscribers = [
            { attributes: { callback_url: 'http://www.example.com/foo' } },
            { attributes: { callback_url: 'http://www.example.com/bar' } },
            { attributes: { callback_url: 'http://www.example.com/baz' } }
        ];

        axiosReqParams = {
            headers: {
                'Content-Type': 'text/xml; charset=UTF-8'
            }
        };

        axiosSuccessRes = { status: 200 };
        axiosFailureRes = { status: 500 };

        dataProvider.PushSubscriber.findAll.returns(Promise.resolve(pushSubscribers));

        notifySubscribers.__set__({
            axios: axios,
            dataProvider: dataProvider,
            config: config
        });
    });

    afterEach(function () {
        sandbox.restore();
    });

    it('should notify subscribers that there was an update', function () {
        axios.post.returns(Promise.resolve(axiosSuccessRes));

        notifySubscribers().then(function () {
            axios.post.calledWith(pushSubscribers[0].attributes.callback_url, axiosReqParams).should.be.true();
            axios.post.calledWith(pushSubscribers[1].attributes.callback_url, axiosReqParams).should.be.true();
            axios.post.calledWith(pushSubscribers[2].attributes.callback_url, axiosReqParams).should.be.true();
        });
    });

    it('should retry notifying a subscriber if a notification fails', function () {
        axios.post
            .withArgs(pushSubscribers[0].attributes.callback_url, axiosReqParams)
            .returns(Promise.resolve(axiosSuccessRes));

        axios.post
            .withArgs(pushSubscribers[1].attributes.callback_url, axiosReqParams)
            .returns(Promise.resolve(axiosSuccessRes));

        axios.post
            .withArgs(pushSubscribers[2].attributes.callback_url, axiosReqParams)
            .onCall(0)
            .returns(Promise.resolve(axiosFailureRes))
            .onCall(1)
            .returns(Promise.resolve(axiosSuccessRes));

        notifySubscribers().then(function () {
            axios.post.withArgs(pushSubscribers[2].attributes.callback_url, axiosReqParams).callCount.should.eql(2);
        });
    });

    it('should only retry notifying a subscriber for a specified amount times', function () {
        axios.post
            .withArgs(pushSubscribers[0].attributes.callback_url, axiosReqParams)
            .returns(Promise.resolve(axiosSuccessRes));

        axios.post
            .withArgs(pushSubscribers[1].attributes.callback_url, axiosReqParams)
            .returns(Promise.resolve(axiosSuccessRes));

        axios.post
            .withArgs(pushSubscribers[2].attributes.callback_url, axiosReqParams)
            .returns(Promise.resolve(axiosFailureRes));

        notifySubscribers().then(function () {
            axios.post.withArgs(pushSubscribers[2].attributes.callback_url, axiosReqParams).callCount.should.eql(config.PuSH.notificationRetryAttempts);
        });
    });
});
