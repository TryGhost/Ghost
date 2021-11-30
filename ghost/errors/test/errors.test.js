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
});
