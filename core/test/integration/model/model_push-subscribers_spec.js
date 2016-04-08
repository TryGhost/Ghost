/*globals describe, before, beforeEach, afterEach, it*/
var testUtils           = require('../../utils'),
    should              = require('should'),
    Promise             = require('bluebird'),

    PushSubscriberModel = require('../../../server/models/push-subscriber').PushSubscriber,
    context             = testUtils.context.internal;

describe.only('Push Subscriber Model', function () {
    var createdPushSubscriberId,
        newPushSubscriberProps = {
            callback_url: 'http://www.example.com',
            topic_url: 'http://www.example.com/rss'
        };

    before(reset);

    beforeEach(function (done) {
        addPushSubscriber()
            .then(function (createdPushSubscriber) {
                createdPushSubscriberId = createdPushSubscriber.attributes.id;
                done();
            })
    });

    afterEach(reset);

    it('can find all push subscribers', function (done) {
        PushSubscriberModel.findAll().then(function (foundPushSubscribers) {
            should.exist(foundPushSubscribers);

            foundPushSubscribers.models.length.should.eql(1);

            done();
        }).catch(done);
    });

    it('can find a push subscriber', function (done) {
        PushSubscriberModel.findOne({id: createdPushSubscriberId}).then(function (foundPushSubscriber) {
            should.exist(foundPushSubscriber);

            foundPushSubscriber.get('subscribed_at').should.be.an.instanceof(Date);
            foundPushSubscriber.get('callback_url').should.eql(newPushSubscriberProps.callback_url);
            foundPushSubscriber.get('topic_url').should.eql(newPushSubscriberProps.topic_url);

            done();
        }).catch(done);
    });

    it('can update a push subscriber by its id', function (done) {
        var updatedCallbackUrl = 'http://www.example.com/foo',
            updatedTopicUrl = 'http://www.example.com/bar';

        PushSubscriberModel.findOne({id: createdPushSubscriberId}).then(function (foundPushSubscriber) {
            should.exist(foundPushSubscriber);

            return foundPushSubscriber.set({callback_url: updatedCallbackUrl, topic_url: updatedTopicUrl}).save(null, context);
        }).then(function () {
            return PushSubscriberModel.findOne({id: createdPushSubscriberId});
        }).then(function (updatedPushSubscriber) {
            should.exist(updatedPushSubscriber);

            updatedPushSubscriber.get('callback_url').should.equal(updatedCallbackUrl);
            updatedPushSubscriber.get('topic_url').should.equal(updatedTopicUrl);

            done();
        }).catch(done);
    });

    it('can delete a push subscriber by its id', function (done) {
        PushSubscriberModel.findOne({id: createdPushSubscriberId}).then(function (foundPushSubscriber) {
            should.exist(foundPushSubscriber);

            foundPushSubscriber.attributes.id.should.equal(createdPushSubscriberId);

            return PushSubscriberModel.destroy({id: createdPushSubscriberId});
        }).then(function (response) {
            response.toJSON().should.be.empty();

            return PushSubscriberModel.findOne({id: createdPushSubscriberId});
        }).then(function (result) {
            should.equal(result, null);

            done();
        }).catch(done);
    });

    it('can find all push subscribers by an array of topic urls', function (done) {
        var alternativePushSubscriberProps = [
            {
                callback_url: 'http://www.example.com',
                topic_url: 'http://www.example.com/rss2'
            },
            {
                callback_url: 'http://www.example.com',
                topic_url: 'http://www.example.com/rss3'
            }
        ],
         tasks = [
            PushSubscriberModel.add(newPushSubscriberProps, context),
            PushSubscriberModel.add(alternativePushSubscriberProps[0], context),
            PushSubscriberModel.add(alternativePushSubscriberProps[0], context),
            PushSubscriberModel.add(alternativePushSubscriberProps[1], context),
            PushSubscriberModel.add(alternativePushSubscriberProps[1], context),
            PushSubscriberModel.add(alternativePushSubscriberProps[1], context)
        ];

        Promise.all(tasks)
            .then(function () {
                return PushSubscriberModel.findAllByTopicUrls([
                    alternativePushSubscriberProps[0].topic_url,
                    alternativePushSubscriberProps[1].topic_url
                ])
            })
            .then(function (foundPushSubscribers) {
                should.exist(foundPushSubscribers);

                foundPushSubscribers.models.length.should.eql(5);

                done();
            }).catch(done);
    });

    function addPushSubscriber() {
        return PushSubscriberModel.add(newPushSubscriberProps, context);
    }

    function reset(done) {
        testUtils.teardown(function () {
            testUtils.setup('default')(done);
        });
    }
});
