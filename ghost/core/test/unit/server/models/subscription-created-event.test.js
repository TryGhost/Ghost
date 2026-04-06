const assert = require('node:assert/strict');
const sinon = require('sinon');
const errors = require('@tryghost/errors');
const models = require('../../../../core/server/models');

describe('Unit: models/SubscriptionCreatedEvent', function () {
    before(function () {
        models.init();
    });

    afterEach(function () {
        sinon.restore();
    });

    describe('validation', function () {
        it('throws error for invalid attribution_type', function () {
            return models.SubscriptionCreatedEvent.add({attribution_type: 'invalid', member_id: '123', subscription_id: '123'})
                .then(function () {
                    throw new Error('expected ValidationError');
                })
                .catch(function (err) {
                    assert.equal(err.length, 1);
                    assert.equal((err[0] instanceof errors.ValidationError), true);
                    assert.match(err[0].context, /members_subscription_created_events\.attribution_type/);
                });
        });

        it('throws if member_id is missing', function () {
            return models.SubscriptionCreatedEvent.add({attribution_type: 'post', subscription_id: '123'})
                .then(function () {
                    throw new Error('expected ValidationError');
                })
                .catch(function (err) {
                    assert.equal(err.length, 1);
                    assert.equal((err[0] instanceof errors.ValidationError), true);
                    assert.match(err[0].context, /members_subscription_created_events\.member_id/);
                });
        });

        it('throws if subscription_id is missing', function () {
            return models.SubscriptionCreatedEvent.add({attribution_type: 'post', member_id: '123'})
                .then(function () {
                    throw new Error('expected ValidationError');
                })
                .catch(function (err) {
                    assert.equal(err.length, 1);
                    assert.equal((err[0] instanceof errors.ValidationError), true);
                    assert.match(err[0].context, /members_subscription_created_events\.subscription_id/);
                });
        });
    });
});
