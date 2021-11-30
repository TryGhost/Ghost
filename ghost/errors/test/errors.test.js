// Switch these lines once there are useful utils
// const testUtils = require('./utils');
require('./utils');

const errors = require('../');

describe('Errors', function () {
    it('Ensure we inherit from Error', function () {
        var ghostError = new errors.InternalServerError();
        (ghostError instanceof Error).should.eql(true);
    });

    describe('Inherit from other error', function () {
        it('default', function () {
            var someError = new Error(), ghostError;

            someError.message = 'test';
            someError.context = 'test';
            someError.help = 'test';

            ghostError = new errors.InternalServerError({err: someError});
            ghostError.stack.should.match(/Error: test/);
            ghostError.context.should.eql(someError.context);
            ghostError.help.should.eql(someError.help);
        });

        it('has nested object', function () {
            var someError = new Error(), ghostError;

            someError.obj = {
                a: 'b'
            };

            ghostError = new errors.InternalServerError({
                err: someError
            });

            ghostError.obj.should.eql(someError.obj);
        });

        it('with custom attribute', function () {
            var someError = new Error(), ghostError;

            someError.context = 'test';

            ghostError = new errors.InternalServerError({
                err: someError,
                context: 'context'
            });

            ghostError.context.should.eql('test');
        });

        it('with custom message', function () {
            var someError = new Error(), ghostError;

            ghostError = new errors.InternalServerError({
                err: someError,
                message: 'test'
            });

            ghostError.message.should.eql('test');
        });

        it('error is string', function () {
            var ghostError = new errors.InternalServerError({
                err: 'string'
            });

            ghostError.stack.should.match(/Error: string/);
        });
    });

    describe('isGhostError', function () {
        it('can determine non-Ghost errors', function () {
            var isGhostError = errors.utils.isGhostError(new Error());
            isGhostError.should.eql(false);
        });

        it('can determine standard GhostError errors', function () {
            var isGhostError = errors.utils.isGhostError(new errors.NotFoundError());
            isGhostError.should.eql(true);
        });

        it('can determine new non-GhostError errors', function () {
            class NonGhostError extends Error {
                constructor(options) {
                    super(options.message);
                }
            }

            class CustomNonGhostError extends NonGhostError {
                constructor(options) {
                    super(options);
                }
            }

            const err = new CustomNonGhostError({
                message: 'Doesn\'t inherit from GhostError'
            });

            var isGhostError = errors.utils.isGhostError(err);
            isGhostError.should.eql(false);
        });
    });

    describe('Serialization', function () {
        it('serialize/deserialize error', function () {
            var err = new errors.BadRequestError({
                help: 'do you need help?',
                context: 'i can\'t help',
                property: 'email'
            });
    
            var serialized = errors.utils.serialize(err);
    
            serialized.should.be.a.JSONErrorResponse({
                status: 400,
                code: 'BadRequestError',
                title: 'BadRequestError',
                detail: 'The request could not be understood.',
                source: {
                    pointer: '/data/attributes/email'
                },
                meta: {
                    level: 'normal',
                    errorType: 'BadRequestError'
                }
            });
    
            var deserialized = errors.utils.deserialize(serialized);
            (deserialized instanceof Error).should.eql(true);
    
            deserialized.id.should.eql(serialized.errors[0].id);
            deserialized.message.should.eql(serialized.errors[0].detail);
            deserialized.name.should.eql(serialized.errors[0].title);
            deserialized.statusCode.should.eql(serialized.errors[0].status);
            deserialized.level.should.eql(serialized.errors[0].meta.level);
            deserialized.help.should.eql(serialized.errors[0].meta.help);
            deserialized.context.should.eql(serialized.errors[0].meta.context);
            deserialized.property.should.eql('email');
    
            err = new errors.BadRequestError();
            serialized = errors.utils.serialize(err);
    
            serialized.should.be.a.JSONErrorResponse({
                status: 400,
                code: 'BadRequestError',
                title: 'BadRequestError',
                detail: 'The request could not be understood.',
                meta: {
                    level: 'normal',
                    errorType: 'BadRequestError'
                }
            });
    
            should.not.exist(serialized.errors[0].error);
            should.not.exist(serialized.errors[0].error_description);
        });
    
        it('oauth serialize', function () {
            var err = new errors.NoPermissionError({
                message: 'Permissions you need to have.'
            });
    
            var serialized = errors.utils.serialize(err, {format: 'oauth'});
    
            serialized.error.should.eql('access_denied');
            serialized.error_description.should.eql('Permissions you need to have.');
            serialized.status.should.eql(403);
            serialized.title.should.eql('NoPermissionError');
            serialized.meta.level.should.eql('normal');
    
            should.not.exist(serialized.message);
            should.not.exist(serialized.detail);
            should.not.exist(serialized.code);
    
            var deserialized = errors.utils.deserialize(serialized, {});
    
            (deserialized instanceof errors.NoPermissionError).should.eql(true);
            (deserialized instanceof Error).should.eql(true);
    
            deserialized.id.should.eql(serialized.id);
            deserialized.message.should.eql(serialized.error_description);
            deserialized.name.should.eql(serialized.title);
            deserialized.statusCode.should.eql(serialized.status);
            deserialized.level.should.eql(serialized.meta.level);
        });
    
        it('[success] deserialize jsonapi, but target error name is unknown', function () {
            var deserialized = errors.utils.deserialize({
                errors: [{
                    name: 'UnknownError',
                    message: 'message'
                }]
            });
    
            (deserialized instanceof errors.InternalServerError).should.eql(true);
            (deserialized instanceof Error).should.eql(true);
    
            deserialized.errorType.should.eql('UnknownError');
            deserialized.message.should.eql('message');
        });
    
        it('[failure] deserialize jsonapi, but obj is empty', function () {
            var deserialized = errors.utils.deserialize({});
            (deserialized instanceof errors.InternalServerError).should.eql(true);
            (deserialized instanceof Error).should.eql(true);
        });
    
        it('[failure] deserialize oauth, but obj is empty', function () {
            var deserialized = errors.utils.deserialize({});
            (deserialized instanceof errors.InternalServerError).should.eql(true);
            (deserialized instanceof Error).should.eql(true);
        });
    
        it('[failure] serialize oauth, but obj is empty', function () {
            var serialized = errors.utils.serialize({}, {format: 'oauth'});
            serialized.error.should.eql('server_error');
        });
    });
});