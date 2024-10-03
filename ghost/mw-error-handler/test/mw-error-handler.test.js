const path = require('path');
const assert = require('assert/strict');
const sinon = require('sinon');

const {InternalServerError, NotFoundError} = require('@tryghost/errors');
const {cacheControlValues} = require('@tryghost/http-cache-utils');
const {
    prepareError,
    jsonErrorRenderer,
    handleHTMLResponse,
    handleJSONResponse,
    prepareErrorCacheControl,
    prepareStack,
    resourceNotFound,
    pageNotFound
} = require('..');

describe('Prepare Error', function () {
    it('Correctly prepares a non-Ghost error', function (done) {
        prepareError(new Error('test!'), {}, {
            set: () => {}
        }, (err) => {
            assert.equal(err.statusCode, 500);
            assert.equal(err.name, 'InternalServerError');
            assert.equal(err.message, 'An unexpected error occurred, please try again.');
            assert.equal(err.context, 'test!');
            assert.equal(err.code, 'UNEXPECTED_ERROR');
            assert.ok(err.stack.startsWith('Error: test!'));
            done();
        });
    });

    it('Correctly prepares a Ghost error', function (done) {
        prepareError(new InternalServerError({message: 'Handled Error', context: 'Details'}), {}, {
            set: () => {}
        }, (err) => {
            assert.equal(err.statusCode, 500);
            assert.equal(err.name, 'InternalServerError');
            assert.equal(err.message, 'Handled Error');
            assert.equal(err.context, 'Details');
            assert.ok(err.stack.startsWith('InternalServerError: Handled Error'));
            done();
        });
    });

    it('Correctly prepares a 404 error', function (done) {
        let error = {message: 'Oh dear', statusCode: 404};

        prepareError(error, {}, {
            set: () => {}
        }, (err) => {
            assert.equal(err.statusCode, 404);
            assert.equal(err.name, 'NotFoundError');
            assert.ok(err.stack.startsWith('NotFoundError: Resource could not be found'));
            assert.equal(err.hideStack, true);
            done();
        });
    });

    it('Correctly prepares an error array', function (done) {
        prepareError([new Error('test!')], {}, {
            set: () => {}
        }, (err) => {
            assert.equal(err.statusCode, 500);
            assert.equal(err.name, 'InternalServerError');
            assert.ok(err.stack.startsWith('Error: test!'));
            done();
        });
    });

    it('Correctly prepares a handlebars error', function (done) {
        let error = new Error('obscure handlebars message!');

        error.stack += '\n';
        error.stack += path.join('node_modules', 'handlebars', 'something');

        prepareError(error, {}, {
            set: () => {}
        }, (err) => {
            assert.equal(err.statusCode, 400);
            assert.equal(err.name, 'IncorrectUsageError');
            // TODO: consider if the message should be trusted here
            assert.equal(err.message, 'obscure handlebars message!');
            assert.ok(err.stack.startsWith('Error: obscure handlebars message!'));
            done();
        });
    });

    it('Correctly prepares an express-hbs error', function (done) {
        let error = new Error('obscure express-hbs message!');

        error.stack += '\n';
        error.stack += path.join('node_modules', 'express-hbs', 'lib');

        prepareError(error, {}, {
            set: () => {}
        }, (err) => {
            assert.equal(err.statusCode, 400);
            assert.equal(err.name, 'IncorrectUsageError');
            assert.equal(err.message, 'obscure express-hbs message!');
            assert.ok(err.stack.startsWith('Error: obscure express-hbs message!'));
            done();
        });
    });

    it('Correctly prepares a known ER_WRONG_VALUE mysql2 error', function (done) {
        let error = new Error('select anything from anywhere where something = anything;');

        error.stack += '\n';
        error.stack += path.join('node_modules', 'mysql2', 'lib');
        error.code = 'ER_WRONG_VALUE';
        error.sql = 'select anything from anywhere where something = anything;';
        error.sqlMessage = 'Incorrect DATETIME value: 3234234234';

        prepareError(error, {}, {
            set: () => {}
        }, (err) => {
            assert.equal(err.statusCode, 422);
            assert.equal(err.name, 'ValidationError');
            assert.equal(err.message, 'Invalid value');
            assert.equal(err.code, 'ER_WRONG_VALUE');
            assert.equal(err.sqlErrorCode, 'ER_WRONG_VALUE');
            assert.equal(err.sql, 'select anything from anywhere where something = anything;');
            assert.equal(err.sqlMessage, 'Incorrect DATETIME value: 3234234234');
            done();
        });
    });

    it('Correctly prepares an unknown mysql2 error', function (done) {
        let error = new Error('select anything from anywhere where something = anything;');

        error.stack += '\n';
        error.stack += path.join('node_modules', 'mysql2', 'lib');
        error.code = 'ER_BAD_FIELD_ERROR';
        error.sql = 'select anything from anywhere where something = anything;';
        error.sqlMessage = 'Incorrect value: erororoor';

        prepareError(error, {}, {
            set: () => {}
        }, (err) => {
            assert.equal(err.statusCode, 500);
            assert.equal(err.name, 'InternalServerError');
            assert.equal(err.message, 'An unexpected error occurred, please try again.');
            assert.equal(err.code, 'UNEXPECTED_ERROR');
            assert.equal(err.sqlErrorCode, 'ER_BAD_FIELD_ERROR');
            assert.equal(err.sql, 'select anything from anywhere where something = anything;');
            assert.equal(err.sqlMessage, 'Incorrect value: erororoor');
            done();
        });
    });
});

describe('Prepare Stack', function () {
    it('Correctly prepares the stack for an error', function (done) {
        prepareStack(new Error('test!'), {}, {}, (err) => {
            // Includes "Stack Trace" text prepending human readable trace
            assert.ok(err.stack.startsWith('Error: test!\nStack Trace:'));
            done();
        });
    });
});

describe('Prepare Error Cache Control', function () {
    it('Sets private cache control by default', function (done) {
        const res = {
            set: sinon.spy()
        };
        prepareErrorCacheControl()(new Error('generic error'), {}, res, () => {
            assert(res.set.calledOnce);
            assert(res.set.calledWith({
                'Cache-Control': cacheControlValues.private
            }));
            done();
        });
    });

    it('Sets private cache-control header for user-specific 404 responses', function (done) {
        const req = {
            method: 'GET',
            get: (header) => {
                if (header === 'authorization') {
                    return 'Basic YWxhZGRpbjpvcGVuc2VzYW1l';
                }
            }
        };
        const res = {
            set: sinon.spy()
        };
        prepareErrorCacheControl()(new NotFoundError(), req, res, () => {
            assert(res.set.calledOnce);
            assert(res.set.calledWith({
                'Cache-Control': cacheControlValues.private
            }));
            done();
        });
    });

    it('Sets noCache cache-control header for non-user-specific 404 responses', function (done) {
        const req = {
            method: 'GET',
            get: () => {
                return false;
            }
        };
        const res = {
            set: sinon.spy(),
            get: () => {
                return false;
            }
        };
        prepareErrorCacheControl()(new NotFoundError(), req, res, () => {
            assert(res.set.calledOnce);
            assert(res.set.calledWith({
                'Cache-Control': cacheControlValues.noCacheDynamic
            }));
            done();
        });
    });
});

describe('Error renderers', function () {
    it('Renders JSON', function (done) {
        jsonErrorRenderer(new Error('test!'), {}, {
            json: (data) => {
                assert.equal(data.errors.length, 1);
                assert.equal(data.errors[0].message, 'test!');
                done();
            }
        }, () => {});
    });

    it('Handles unknown errors when preparing user message', function (done) {
        jsonErrorRenderer(new RangeError('test!'), {
            frameOptions: {
                docName: 'oembed',
                method: 'read'
            }
        }, {
            json: (data) => {
                assert.equal(data.errors.length, 1);
                assert.equal(data.errors[0].message, 'Unknown error - RangeError, cannot read oembed.');
                assert.equal(data.errors[0].context, 'test!');
                done();
            }
        }, () => {});
    });

    it('Uses templates when required', function (done) {
        jsonErrorRenderer(new InternalServerError({
            message: 'test!'
        }), {
            frameOptions: {
                docName: 'blog',
                method: 'browse'
            }
        }, {
            json: (data) => {
                assert.equal(data.errors.length, 1);
                assert.equal(data.errors[0].message, 'Internal server error, cannot list blog.');
                assert.equal(data.errors[0].context, 'test!');
                done();
            }
        }, () => {});
    });

    it('Uses defined message + context when available', function (done) {
        jsonErrorRenderer(new InternalServerError({
            message: 'test!',
            context: 'Image was too large.'
        }), {
            frameOptions: {
                docName: 'images',
                method: 'upload'
            }
        }, {
            json: (data) => {
                assert.equal(data.errors.length, 1);
                assert.equal(data.errors[0].message, 'Internal server error, cannot upload image.');
                assert.equal(data.errors[0].context, 'test! Image was too large.');
                done();
            }
        }, () => {});
    });

    it('Exports the HTML renderer', function () {
        const renderer = handleHTMLResponse({
            errorHandler: () => {}
        });

        assert.equal(renderer.length, 4);
    });

    it('Exports the JSON renderer', function () {
        const renderer = handleJSONResponse({
            errorHandler: () => {}
        });

        assert.equal(renderer.length, 5);
    });
});

describe('Resource Not Found', function () {
    it('Returns 404 Not Found Error for a generic case', function (done) {
        resourceNotFound({}, {}, (error) => {
            assert.equal(error.statusCode, 404);
            assert.equal(error.message, 'Resource not found');
            done();
        });
    });

    it('Returns 406 Request Not Acceptable Error for invalid version', function (done) {
        const req = {
            headers: {
                'accept-version': 'foo'
            }
        };

        const res = {
            locals: {
                safeVersion: '4.3'
            }
        };

        resourceNotFound(req, res, (error) => {
            assert.equal(error.statusCode, 400);
            assert.equal(error.message, 'Requested version is not supported.');
            done();
        });
    });

    it('Returns 406 Request Not Acceptable Error for when requested version is behind current version', function (done) {
        const req = {
            headers: {
                'accept-version': 'v3.9'
            }
        };

        const res = {
            locals: {
                safeVersion: '4.3'
            }
        };

        resourceNotFound(req, res, (error) => {
            assert.equal(error.statusCode, 406);
            assert.equal(error.message, 'Request could not be served, the endpoint was not found.');
            assert.equal(error.context, 'Provided client accept-version v3.9 is behind current Ghost version v4.3.');
            assert.equal(error.help, 'Try upgrading your Ghost API client.');
            done();
        });
    });

    it('Returns 406 Request Not Acceptable Error for when requested version is ahead current version', function (done) {
        const req = {
            headers: {
                'accept-version': 'v4.8'
            }
        };

        const res = {
            locals: {
                safeVersion: '4.3'
            }
        };

        resourceNotFound(req, res, (error) => {
            assert.equal(error.statusCode, 406);
            assert.equal(error.message, 'Request could not be served, the endpoint was not found.');
            assert.equal(error.context, 'Provided client accept-version v4.8 is ahead of current Ghost version v4.3.');
            assert.equal(error.help, 'Try upgrading your Ghost install.');
            done();
        });
    });

    it('Returns 404 Not Found Error for when requested version is the same as current version', function (done) {
        const req = {
            headers: {
                'accept-version': 'v4.3'
            }
        };

        const res = {
            locals: {
                safeVersion: '4.3'
            }
        };

        resourceNotFound(req, res, (error) => {
            assert.equal(error.statusCode, 404);
            assert.equal(error.message, 'Resource not found');
            done();
        });
    });

    describe('pageNotFound', function () {
        it('returns 404 with special message when message not set', function (done) {
            pageNotFound({}, {}, (error) => {
                assert.equal(error.statusCode, 404);
                assert.equal(error.message, 'Page not found');
                done();
            });
        });

        it('returns 404 with special message even if message is set', function (done) {
            pageNotFound({message: 'uh oh'}, {}, (error) => {
                assert.equal(error.statusCode, 404);
                assert.equal(error.message, 'Page not found');
                done();
            });
        });
    });
});
