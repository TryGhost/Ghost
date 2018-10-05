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
