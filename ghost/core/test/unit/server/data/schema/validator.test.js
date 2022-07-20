const should = require('should');
const _ = require('lodash');
const ObjectId = require('bson-objectid');
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

                    err.length.should.eql(6);

                    const errorMessages = _.map(err, function (object) {
                        return object.message;
                    }).join(',');

                    // NOTE: Some of these fields are auto-filled in the model layer (e.g. created_at, created_at etc.)
                    ['id', 'uuid', 'slug', 'title', 'created_at', 'created_by'].forEach(function (attr) {
                        errorMessages.should.match(new RegExp('posts.' + attr));
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

                    err.length.should.eql(1);
                    err[0].message.should.match(/posts\.id/);
                });
        });

        it('should pass', function () {
            return validateSchema(
                'posts',
                models.Post.forge(testUtils.DataGenerator.forKnex.createPost({slug: 'title'})),
                {method: 'insert'}
            );
        });

        it('transforms 0 and 1', function () {
            const post = models.Post.forge(testUtils.DataGenerator.forKnex.createPost({slug: 'test', featured: 0}));
            post.get('featured').should.eql(0);

            return validateSchema('posts', post, {method: 'insert'})
                .then(function () {
                    post.get('featured').should.eql(false);
                });
        });

        it('keeps true or false', function () {
            const post = models.Post.forge(testUtils.DataGenerator.forKnex.createPost({slug: 'test', featured: true}));
            post.get('featured').should.eql(true);

            return validateSchema('posts', post, {method: 'insert'})
                .then(function () {
                    post.get('featured').should.eql(true);
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

                    err.length.should.eql(1);
                    err[0].errorType.should.eql('ValidationError');
                    err[0].message.should.match(/isLowercase/);
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

                    err.length.should.eql(1);
                    err[0].message.should.match(/isUUID/);
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

                    err.length.should.eql(1);
                    err[0].message.should.match(/posts\.created_at/);
                });
        });
    });
});
