var _ = require('lodash'),
    should = require('should'),
    sinon = require('sinon'),
    testUtils = require('../../utils'),
    Promise = require('bluebird'),
    WebhookAPI = require('../../../server/api/v0.1/webhooks'),
    sandbox = sinon.sandbox.create();

describe('Webhooks API', function () {
    beforeEach(testUtils.teardown);
    beforeEach(testUtils.setup('webhooks', 'users:roles', 'perms:webhook', 'perms:init'));

    afterEach(function () {
        sandbox.restore();
    });

    after(testUtils.teardown);

    function checkForErrorType(type, done) {
        return function checkForErrorType(error) {
            if (Array.isArray(error)) {
                error = error[0];
            }

            if (error.errorType) {
                error.errorType.should.eql(type);
                done();
            } else {
                done(error);
            }
        };
    }

    describe('Validations', function () {
        // @TODO: add this test to the validation test (test/unit/data/validation/index_spec.js) -> event name is upper case
        it('Prevents mixed case event names', function (done) {
            WebhookAPI.add({webhooks: [{
                event: 'Mixed.Case',
                target_url: 'https://example.com/hooks/test'
            }]}, testUtils.context.owner)
                .then(function () {
                    done(new Error('Should not allow mixed case event names'));
                }).catch(checkForErrorType('ValidationError', done));
        });

        // @TODO: this is a webhook model test for getByEventAndTarget (!)
        it('Prevents duplicate event/target pairs', function (done) {
            var duplicate = testUtils.DataGenerator.Content.webhooks[0];

            WebhookAPI.add({webhooks: [{
                event: duplicate.event,
                target_url: duplicate.target_url
            }]}, testUtils.context.owner)
                .then(function () {
                    done(new Error('Should not allow duplicate event/target'));
                }).catch(checkForErrorType('ValidationError', done));
        });
    });
});
