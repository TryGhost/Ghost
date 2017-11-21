var _ = require('lodash'),
    should = require('should'),
    sinon = require('sinon'),
    testUtils = require('../../utils'),
    Promise = require('bluebird'),
    WebhookAPI = require('../../../server/api/webhooks'),
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
        it('Prevents mixed case event names', function (done) {
            WebhookAPI.add({webhooks: [{
                event: 'Mixed.Case',
                target_url: 'https://example.com/hooks/test'
            }]}, testUtils.context.owner)
                .then(function () {
                    done(new Error('Should not allow mixed case event names'));
                }).catch(checkForErrorType('ValidationError', done));
        });

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

    describe('Permissions', function () {
        var firstWebhook = testUtils.DataGenerator.Content.webhooks[0].id;
        var newWebhook;

        function checkAddResponse(response) {
            should.exist(response);
            should.exist(response.webhooks);
            should.not.exist(response.meta);

            response.webhooks.should.have.length(1);
            testUtils.API.checkResponse(response.webhooks[0], 'webhook');
            response.webhooks[0].created_at.should.be.an.instanceof(Date);
        }

        beforeEach(function () {
            newWebhook = {
                event: 'test.added',
                target_url: 'https://example.com/webhooks/test-added'
            };
        });

        describe('Owner', function () {
            it('Can add', function (done) {
                WebhookAPI.add({webhooks: [newWebhook]}, testUtils.context.owner)
                    .then(function (response) {
                        checkAddResponse(response);
                        done();
                    }).catch(done);
            });

            it('Can delete', function (done) {
                WebhookAPI.destroy(_.extend({}, testUtils.context.owner, {id: firstWebhook}))
                    .then(function (results) {
                        should.not.exist(results);
                        done();
                    });
            });
        });

        describe('Admin', function () {
            it('Can add', function (done) {
                WebhookAPI.add({webhooks: [newWebhook]}, testUtils.context.admin)
                    .then(function (response) {
                        checkAddResponse(response);
                        done();
                    }).catch(done);
            });

            it('Can delete', function (done) {
                WebhookAPI.destroy(_.extend({}, testUtils.context.admin, {id: firstWebhook}))
                    .then(function (results) {
                        should.not.exist(results);
                        done();
                    });
            });
        });

        describe('Editor', function () {
            it('CANNOT add', function (done) {
                WebhookAPI.add({webhooks: [newWebhook]}, testUtils.context.editor)
                    .then(function () {
                        done(new Error('Editor should not be able to add a webhook'));
                    }).catch(checkForErrorType('NoPermissionError', done));
            });

            it('CANNOT delete', function (done) {
                WebhookAPI.destroy(_.extend({}, testUtils.context.editor, {id: firstWebhook}))
                    .then(function () {
                        done(new Error('Editor should not be able to delete a webhook'));
                    }).catch(checkForErrorType('NoPermissionError', done));
             });
        });

        describe('Author', function () {
            it('CANNOT add', function (done) {
                WebhookAPI.add({webhooks: [newWebhook]}, testUtils.context.author)
                    .then(function () {
                        done(new Error('Author should not be able to add a webhook'));
                    }).catch(checkForErrorType('NoPermissionError', done));
            });

            it('CANNOT delete', function (done) {
                WebhookAPI.destroy(_.extend({}, testUtils.context.author, {id: firstWebhook}))
                    .then(function () {
                        done(new Error('Editor should not be able to delete a webhook'));
                    }).catch(checkForErrorType('NoPermissionError', done));
             });
        });
    });
});
