const should = require('should');
const _ = require('lodash');
const ObjectId = require('bson-objectid');
const testUtils = require('../../../utils');
const models = require('../../../../core/server/models');
const validation = require('../../../../core/server/data/validation');

// Validate our customisations
describe('Validation', function () {
    before(function () {
        models.init();
    });

    it('should export our required functions', function () {
        should.exist(validation);

        validation.should.have.properties(
            ['validate', 'validator', 'validateSchema']
        );

        validation.validate.should.be.a.Function();
        validation.validatePassword.should.be.a.Function();
        validation.validateSchema.should.be.a.Function();

        validation.validator.should.have.properties(['empty', 'notContains', 'isTimezone', 'isEmptyOrURL', 'isSlug']);
    });

    describe('Validate Schema', function () {
        describe('models.add', function () {
            it('blank model', function () {
                // NOTE: Fields with `defaultTo` are getting ignored. This is handled on the DB level.
                return validation.validateSchema('posts', models.Post.forge(), {method: 'insert'})
                    .then(function () {
                        throw new Error('Expected ValidationError.');
                    })
                    .catch(function (err) {
                        if (!_.isArray(err)) {
                            throw err;
                        }

                        err.length.should.eql(7);

                        const errorMessages = _.map(err, function (object) {
                            return object.message;
                        }).join(',');

                        // NOTE: Some of these fields are auto-filled in the model layer (e.g. author_id, created_at etc.)
                        ['id', 'uuid', 'slug', 'title', 'author_id', 'created_at', 'created_by'].forEach(function (attr) {
                            errorMessages.should.match(new RegExp('posts.' + attr));
                        });
                    });
            });

            it('blank id', function () {
                const postModel = models.Post.forge(testUtils.DataGenerator.forKnex.createPost({
                    id: null,
                    slug: 'test'
                }));

                return validation.validateSchema('posts', postModel, {method: 'insert'})
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
                return validation.validateSchema(
                    'posts',
                    models.Post.forge(testUtils.DataGenerator.forKnex.createPost({slug: 'title'})),
                    {method: 'insert'}
                );
            });

            it('transforms 0 and 1', function () {
                const post = models.Post.forge(testUtils.DataGenerator.forKnex.createPost({slug: 'test', featured: 0}));
                post.get('featured').should.eql(0);

                return validation.validateSchema('posts', post, {method: 'insert'})
                    .then(function () {
                        post.get('featured').should.eql(false);
                    });
            });

            it('keeps true or false', function () {
                const post = models.Post.forge(testUtils.DataGenerator.forKnex.createPost({slug: 'test', featured: true}));
                post.get('featured').should.eql(true);

                return validation.validateSchema('posts', post, {method: 'insert'})
                    .then(function () {
                        post.get('featured').should.eql(true);
                    });
            });
        });

        describe('webhooks.add', function () {
            it('event name is not lowercase', function () {
                const webhook = models.Webhook.forge(testUtils.DataGenerator.forKnex.createWebhook({event: 'Test'}));

                // NOTE: Fields with `defaultTo` are getting ignored. This is handled on the DB level.
                return validation.validateSchema('webhooks', webhook, {method: 'insert'})
                    .then(function () {
                        throw new Error('Expected ValidationError.');
                    })
                    .catch(function (err) {
                        if (!_.isArray(err)) {
                            throw err;
                        }

                        err.length.should.eql(1);
                        err[0].errorType.should.eql('ValidationError');
                    });
            });
        });

        describe('models.edit', function () {
            it('uuid is invalid', function () {
                const postModel = models.Post.forge({id: ObjectId.generate(), uuid: '1234'});

                postModel.changed = {uuid: postModel.get('uuid')};

                return validation.validateSchema('posts', postModel)
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
                const postModel = models.Post.forge({id: ObjectId.generate(), created_at: null});

                postModel.changed = {created_at: postModel.get('updated_at')};

                return validation.validateSchema('posts', postModel)
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

    describe('Assert the Validator dependency', function () {
        const validator = validation.validator;

        it('isEmptyOrUrl filters javascript urls', function () {
            validator.isEmptyOrURL('javascript:alert(0)').should.be.false();
            validator.isEmptyOrURL('http://example.com/lol/<script>lalala</script>/').should.be.false();
            validator.isEmptyOrURL('http://example.com/lol?somequery=<script>lalala</script>').should.be.false();
            validator.isEmptyOrURL('').should.be.true();
            validator.isEmptyOrURL('http://localhost:2368').should.be.true();
            validator.isEmptyOrURL('http://example.com/test/').should.be.true();
            validator.isEmptyOrURL('http://www.example.com/test/').should.be.true();
            validator.isEmptyOrURL('http://example.com/foo?somequery=bar').should.be.true();
            validator.isEmptyOrURL('example.com/test/').should.be.true();
        });
    });
});
