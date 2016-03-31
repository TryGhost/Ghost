/*globals describe, before, beforeEach, afterEach, it*/
var testUtils           = require('../../utils'),
    should              = require('should'),

    PushSubscriberModel = require('../../../server/models/push-subscriber').PushSubscriber,
    context             = testUtils.context.internal;

describe.only('Push Subscriber Model', function () {
    var createdPushSubscriberId,
        newPushSubscriberProps = {
            callback_url: 'http://www.example.com'
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

            done();
        }).catch(done);
    });

    it('can update a push subscriber by its id', function (done) {
        var updatedCallbackUrl = 'http://www.example.com/foo';

        PushSubscriberModel.findOne({id: createdPushSubscriberId}).then(function (foundPushSubscriber) {
            should.exist(foundPushSubscriber);

            return foundPushSubscriber.set({callback_url: updatedCallbackUrl}).save(null, context);
        }).then(function () {
            return PushSubscriberModel.findOne({id: createdPushSubscriberId});
        }).then(function (updatedPushSubscriber) {
            should.exist(updatedPushSubscriber);

            updatedPushSubscriber.get('callback_url').should.equal(updatedCallbackUrl);

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

    function addPushSubscriber() {
        return PushSubscriberModel.add(newPushSubscriberProps, context);
    }

    function reset(done) {
        testUtils.teardown(function () {
            testUtils.setup('default')(done);
        });
    }
});
