var errors = require('../../server/errors'),
    should = require('should');

should.equal(true, true);

describe('Errors', function () {
    it('Ensure we inherit from Error', function () {
        var ghostError = new errors.GhostError();
        (ghostError instanceof Error).should.eql(true);
    });

    describe('Inherite from other error', function () {
        it('default', function () {
            var someError = new Error(), ghostError;

            someError.message = 'test';
            someError.context = 'test';
            someError.help = 'test';

            ghostError = new errors.GhostError({err: someError});
            ghostError.message.should.eql(someError.message);
            ghostError.context.should.eql(someError.context);
            ghostError.help.should.eql(someError.help);
        });

        it('has nested object', function () {
            var someError = new Error(), ghostError;

            someError.message = 'test';
            someError.obj = {
                a: 'b'
            };

            ghostError = new errors.GhostError({
                err: someError
            });

            ghostError.message.should.eql(someError.message);
            ghostError.obj.should.eql(someError.obj);
        });

        it('with custom attribute', function () {
            var someError = new Error(), ghostError;

            someError.message = 'test';
            someError.context = 'test';

            ghostError = new errors.GhostError({
                err: someError,
                context: 'context'
            });

            ghostError.message.should.eql(someError.message);
            ghostError.context.should.eql('test');
        });

        it('with custom attribute', function () {
            var someError = new Error(), ghostError;

            someError.message = 'test';

            ghostError = new errors.GhostError({
                err: someError,
                context: 'context'
            });

            ghostError.message.should.eql(someError.message);
            ghostError.context.should.eql('context');
        });

        it('error is string', function () {
            var ghostError = new errors.GhostError({
                err: 'string'
            });

            ghostError.message.should.eql('string');
        });
    });
});
