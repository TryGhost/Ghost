const assert = require('node:assert/strict');
const _ = require('lodash');
const ObjectId = require('bson-objectid').default;
const testUtils = require('../../../../utils');
const models = require('../../../../../core/server/models');

const validateSchema = require('../../../../../core/server/data/schema/validator');

describe('Validate Schema', function () {
    before(function () {
        models.init();
    });

    describe('models.add', function () {
        it('blank model', function () {
            // NOTE: Fields with `defaultTo` are getting ignored. This is handled on the DB level.
            return validateSchema('posts', models.Post.forge(), {method: 'insert'})
                .then(function () {
                    throw new Error('Expected ValidationError.');
                })
                .catch(function (err) {
                    if (!_.isArray(err)) {
                        throw err;
                    }

                    assert.equal(err.length, 5);

                    const errorMessages = _.map(err, function (object) {
                        return object.message;
                    }).join(',');

                    // NOTE: Some of these fields are auto-filled in the model layer (e.g. created_at, created_at etc.)
                    ['id', 'uuid', 'slug', 'title', 'created_at'].forEach(function (attr) {
                        assert.match(errorMessages, RegExp('posts.' + attr));
                    });
                });
        });

        it('blank id', function () {
            const postModel = models.Post.forge(testUtils.DataGenerator.forKnex.createPost({
                id: null,
                slug: 'test'
            }));

            return validateSchema('posts', postModel, {method: 'insert'})
                .then(function () {
                    throw new Error('Expected ValidationError.');
                })
                .catch(function (err) {
                    if (!_.isArray(err)) {
                        throw err;
                    }

                    assert.equal(err.length, 1);
                    assert.match(err[0].message, /posts\.id/);
                });
        });

        it('should pass', function () {
            return validateSchema(
                'posts',
                models.Post.forge(testUtils.DataGenerator.forKnex.createPost({slug: 'title'})),
                {method: 'insert'}
            );
        });

        it('transforms 0 and 1 (boolean)', async function () {
            const user = models.User.forge(testUtils.DataGenerator.forKnex.createUser({email: 'test@example.com', comment_notifications: 0}));
            assert.equal(user.get('comment_notifications'), 0);

            await validateSchema('users', user, {method: 'insert'});
            assert.equal(user.get('comment_notifications'), false);
        });

        it('keeps true or false', function () {
            const post = models.Post.forge(testUtils.DataGenerator.forKnex.createPost({slug: 'test', featured: true}));
            assert.equal(post.get('featured'), true);

            return validateSchema('posts', post, {method: 'insert'})
                .then(function () {
                    assert.equal(post.get('featured'), true);
                });
        });
    });

    describe('webhooks.add', function () {
        it('event name is not lowercase', function () {
            const webhook = models.Webhook.forge(testUtils.DataGenerator.forKnex.createWebhook({
                event: 'Test',
                integration_id: testUtils.DataGenerator.Content.integrations[0].id
            }));

            // NOTE: Fields with `defaultTo` are getting ignored. This is handled on the DB level.
            return validateSchema('webhooks', webhook, {method: 'insert'})
                .then(function () {
                    throw new Error('Expected ValidationError.');
                })
                .catch(function (err) {
                    if (!_.isArray(err)) {
                        throw err;
                    }

                    assert.equal(err.length, 1);
                    assert.equal(err[0].errorType, 'ValidationError');
                    assert.match(err[0].message, /isLowercase/);
                });
        });
    });

    describe('models.edit', function () {
        it('uuid is invalid', function () {
            const postModel = models.Post.forge({id: ObjectId().toHexString(), uuid: '1234'});

            postModel.changed = {uuid: postModel.get('uuid')};

            return validateSchema('posts', postModel)
                .then(function () {
                    throw new Error('Expected ValidationError.');
                })
                .catch(function (err) {
                    if (!_.isArray(err)) {
                        throw err;
                    }

                    assert.equal(err.length, 1);
                    assert.match(err[0].message, /isUUID/);
                });
        });

        it('date is null', function () {
            const postModel = models.Post.forge({id: ObjectId().toHexString(), created_at: null});

            postModel.changed = {created_at: postModel.get('updated_at')};

            return validateSchema('posts', postModel)
                .then(function () {
                    throw new Error('Expected ValidationError.');
                })
                .catch(function (err) {
                    if (!_.isArray(err)) {
                        throw err;
                    }

                    assert.equal(err.length, 1);
                    assert.match(err[0].message, /posts\.created_at/);
                });
        });
    });
});
