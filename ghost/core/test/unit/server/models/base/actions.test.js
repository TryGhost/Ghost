const assert = require('node:assert/strict');
const sinon = require('sinon');
const models = require('../../../../../core/server/models');

describe('Unit: models/base/plugins/actions', function () {
    let TestModel;

    before(function () {
        models.init();
    });

    beforeEach(function () {
        // Create a test model that has actions enabled
        TestModel = models.Base.Model.extend({
            tableName: 'test_models',
            actionsCollectCRUD: true,
            actionsResourceType: 'test_resource',
            actionsExtraContext: ['status', 'extra_field']
        });
    });

    afterEach(function () {
        sinon.restore();
    });

    describe('getAction', function () {
        describe('Missing configuration', function () {
            it('should return undefined when actionsCollectCRUD is false', function () {
                const UnconfiguredModel = models.Base.Model.extend({
                    tableName: 'test',
                    actionsCollectCRUD: false
                });
                const testModel = UnconfiguredModel.forge({});
                sinon.stub(testModel, 'getActor').returns({
                    id: 'abcd1234',
                    type: 'user'
                });

                const action = testModel.getAction('added', {});
                assert.equal(action, undefined);
            });
            it('should return undefined when actionsResourceType is not set', function () {
                const UnconfiguredModel = models.Base.Model.extend({
                    tableName: 'test',
                    actionsCollectCRUD: true,
                    actionsResourceType: null
                });
                const testModel = UnconfiguredModel.forge({});
                sinon.stub(testModel, 'getActor').returns({
                    id: 'abcd1234',
                    type: 'user'
                });
                const action = testModel.getAction('added', {});
                assert.equal(action, undefined);
            });
        });
        describe('Basic action data', function () {
            it('should return correct action data for added event', function () {
                const testModel = TestModel.forge({
                    id: '1234ef',
                    email: 'test@example.com',
                    status: 'pending',
                    extra_field: 'some_value'
                });

                const options = {
                    context: {
                        user: 'abcd1234'
                    }
                };

                // Stub the getActor method
                sinon.stub(testModel, 'getActor').returns({
                    id: 'abcd1234',
                    type: 'user'
                });

                const action = testModel.getAction('added', options);

                assert.equal(action.event, 'added');
                assert.equal(action.resource_id, '1234ef');
                assert.equal(action.resource_type, 'test_resource');
                assert.equal(action.actor_id, 'abcd1234');
                assert.equal(action.actor_type, 'user');
                assert.equal(action.context.primary_name, 'test@example.com');
                assert.equal(action.context.status, 'pending');
                assert.equal(action.context.extra_field, 'some_value');
            });

            it('should return correct action data for edited event', function () {
                const testModel = TestModel.forge({
                    id: '1234ef',
                    email: 'new@example.com',
                    status: 'pending',
                    extra_field: 'new_value'
                });

                // Simulate an edit where email changed
                testModel._previousAttributes = {
                    email: 'old@example.com',
                    status: 'pending',
                    extra_field: 'old_value'
                };

                const options = {
                    context: {
                        user: 'abcd1234'
                    }
                };

                sinon.stub(testModel, 'getActor').returns({
                    id: 'abcd1234',
                    type: 'user'
                });

                const action = testModel.getAction('edited', options);

                assert.equal(action.event, 'edited');
                assert.equal(action.resource_id, '1234ef');
                assert.equal(action.resource_type, 'test_resource');
                assert.equal(action.context.primary_name, 'new@example.com');
                assert.equal(action.context.status, 'pending');
                assert.equal(action.context.extra_field, 'new_value');
            });

            it('should use previous email for edited event when current email is null', function () {
                const testModel = TestModel.forge({
                    id: '1234ef',
                    status: 'pending',
                    extra_field: 'value'
                });

                // Simulate a case where email was removed
                testModel._previousAttributes = {
                    email: 'old@example.com',
                    status: 'pending',
                    extra_field: 'value'
                };
                testModel.unset('email');

                const options = {
                    context: {
                        user: 'abcd1234'
                    }
                };

                sinon.stub(testModel, 'getActor').returns({
                    id: 'abcd1234',
                    type: 'user'
                });

                const action = testModel.getAction('edited', options);

                assert.equal(action.context.primary_name, 'old@example.com');
            });

            it('should return correct action data for deleted event', function () {
                const testModel = TestModel.forge({
                    id: '1234ef'
                });

                // For a deleted event, we need to set previous attributes and clear current ones
                testModel._previousAttributes = {
                    id: '1234ef',
                    email: 'deleted@example.com',
                    status: 'sent',
                    extra_field: 'deleted_value'
                };
                // Clear current attributes to simulate deletion
                testModel.clear();

                const options = {
                    context: {
                        user: 'abcd1234'
                    }
                };

                sinon.stub(testModel, 'getActor').returns({
                    id: 'abcd1234',
                    type: 'user'
                });

                const action = testModel.getAction('deleted', options);

                assert.equal(action.event, 'deleted');
                assert.equal(action.resource_id, '1234ef');
                assert.equal(action.resource_type, 'test_resource');
                assert.equal(action.context.primary_name, 'deleted@example.com');
                assert.equal(action.context.status, 'sent');
                assert.equal(action.context.extra_field, 'deleted_value');
            });

            it('should include actionName in context when provided', function () {
                const testModel = TestModel.forge({
                    id: '1234ef',
                    email: 'test@example.com',
                    status: 'pending',
                    extra_field: 'value'
                });

                const options = {
                    context: {
                        user: 'abcd1234'
                    },
                    actionName: 'customAction'
                };

                sinon.stub(testModel, 'getActor').returns({
                    id: 'abcd1234',
                    type: 'user'
                });

                const action = testModel.getAction('edited', options);

                assert.equal(action.context.action_name, 'customAction');
            });

            it('should return undefined when no actor is found', function () {
                const testModel = TestModel.forge({
                    id: '1234ef',
                    email: 'test@example.com'
                });

                const options = {
                    context: {
                        internal: true
                    }
                };

                sinon.stub(testModel, 'getActor').returns(null);

                const action = testModel.getAction('added', options);

                assert.equal(action, undefined);
            });

            it('should handle models without wasChanged method gracefully', function () {
                const testModel = TestModel.forge({
                    id: '1234ef',
                    email: 'test@example.com'
                });

                const options = {
                    context: {
                        user: 'abcd1234'
                    }
                };

                sinon.stub(testModel, 'getActor').returns({
                    id: 'abcd1234',
                    type: 'user'
                });
                sinon.stub(testModel, 'wasChanged').returns(false);

                // The addAction method checks wasChanged, not getAction
                // So we'll test it doesn't generate an action when nothing changed
                const getActionStub = sinon.stub(testModel, 'getAction');

                TestModel.prototype.addAction.call(testModel, testModel, 'edited', options);

                assert.equal(getActionStub.called, false);
            });
        });

        describe('Primary name extraction', function () {
            it('should handle models with title field', function () {
                const TitleModel = models.Base.Model.extend({
                    tableName: 'title_models',
                    actionsCollectCRUD: true,
                    actionsResourceType: 'post'
                });

                const postModel = TitleModel.forge({
                    id: '1234ef',
                    title: 'My Post Title'
                });

                sinon.stub(postModel, 'getActor').returns({id: 'abcd1234', type: 'user'});

                const action = postModel.getAction('added', {});

                assert.equal(action.context.primary_name, 'My Post Title');
            });

            it('should handle models with name field', function () {
                const NameModel = models.Base.Model.extend({
                    tableName: 'name_models',
                    actionsCollectCRUD: true,
                    actionsResourceType: 'tag'
                });

                const tagModel = NameModel.forge({
                    id: '1234ef',
                    name: 'Featured'
                });

                sinon.stub(tagModel, 'getActor').returns({id: 'abcd1234', type: 'user'});

                const action = tagModel.getAction('added', {});

                assert.equal(action.context.primary_name, 'Featured');
            });

            it('should fallback through title -> name -> email for primary name', function () {
                const FallbackModel = models.Base.Model.extend({
                    tableName: 'fallback_models',
                    actionsCollectCRUD: true,
                    actionsResourceType: 'resource'
                });

                const model = FallbackModel.forge({
                    id: '1234ef'
                });

                // Set previous attributes
                model._previousAttributes = {
                    email: 'fallback@example.com'
                };

                sinon.stub(model, 'getActor').returns({id: 'abcd1234', type: 'user'});

                const action = model.getAction('edited', {});

                assert.equal(action.context.primary_name, 'fallback@example.com');
            });
        });
    });
});
