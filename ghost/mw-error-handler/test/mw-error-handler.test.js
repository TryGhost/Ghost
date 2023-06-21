// Switch these lines once there are useful utils
// const testUtils = require('./utils');
require('./utils');
const path = require('path');
const should = require('should');
const assert = require('assert/strict');
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
            err.statusCode.should.eql(500);
            err.name.should.eql('InternalServerError');
            err.message.should.eql('An unexpected error occurred, please try again.');
            err.context.should.eql('test!');
            err.code.should.eql('UNEXPECTED_ERROR');
            err.stack.should.startWith('Error: test!');
            done();
        });
    });

    it('Correctly prepares a Ghost error', function (done) {
        prepareError(new InternalServerError({message: 'Handled Error', context: 'Details'}), {}, {
            set: () => {}
        }, (err) => {
            err.statusCode.should.eql(500);
            err.name.should.eql('InternalServerError');
            err.message.should.eql('Handled Error');
            err.context.should.eql('Details');
            err.stack.should.startWith('InternalServerError: Handled Error');
            done();
        });
    });

    it('Correctly prepares a 404 error', function (done) {
        let error = {message: 'Oh dear', statusCode: 404};

        prepareError(error, {}, {
            set: () => {}
        }, (err) => {
            err.statusCode.should.eql(404);
            err.name.should.eql('NotFoundError');
            err.stack.should.startWith('NotFoundError: Resource could not be found');
            err.hideStack.should.eql(true);
            done();
        });
    });

    it('Correctly prepares an error array', function (done) {
        prepareError([new Error('test!')], {}, {
            set: () => {}
        }, (err) => {
            err.statusCode.should.eql(500);
            err.name.should.eql('InternalServerError');
            err.stack.should.startWith('Error: test!');
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
            err.statusCode.should.eql(400);
            err.name.should.eql('IncorrectUsageError');
            // TODO: consider if the message should be trusted here
            err.message.should.eql('obscure handlebars message!');
            err.stack.should.startWith('Error: obscure handlebars message!');
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
            err.statusCode.should.eql(400);
            err.name.should.eql('IncorrectUsageError');
            err.message.should.eql('obscure express-hbs message!');
            err.stack.should.startWith('Error: obscure express-hbs message!');
            done();
        });
    });
});

describe('Prepare Stack', function () {
    it('Correctly prepares the stack for an error', function (done) {
        prepareStack(new Error('test!'), {}, {}, (err) => {
            // Includes "Stack Trace" text prepending human readable trace
            err.stack.should.startWith('Error: test!\nStack Trace:');
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
                data.errors.length.should.eql(1);
                data.errors[0].message.should.eql('test!');
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
                data.errors.length.should.eql(1);
                data.errors[0].message.should.eql('Unknown error - RangeError, cannot read oembed.');
                data.errors[0].context.should.eql('test!');
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
                data.errors.length.should.eql(1);
                data.errors[0].message.should.eql('Internal server error, cannot list blog.');
                data.errors[0].context.should.eql('test!');
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
                data.errors.length.should.eql(1);
                data.errors[0].message.should.eql('Internal server error, cannot upload image.');
                data.errors[0].context.should.eql('test! Image was too large.');
                done();
            }
        }, () => {});
    });

    it('Exports the HTML renderer', function () {
        const renderer = handleHTMLResponse({
            errorHandler: () => {}
        });

        renderer.length.should.eql(4);
    });

    it('Exports the JSON renderer', function () {
        const renderer = handleJSONResponse({
            errorHandler: () => {}
        });

        renderer.length.should.eql(5);
    });
});

describe('Resource Not Found', function () {
    it('Returns 404 Not Found Error for a generic case', function (done) {
        resourceNotFound({}, {}, (error) => {
            should.equal(error.statusCode, 404);
            should.equal(error.message, 'Resource not found');
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
            should.equal(error.statusCode, 406);
            should.equal(error.message, 'Request could not be served, the endpoint was not found.');
            should.equal(error.context, 'Provided client accept-version v3.9 is behind current Ghost version v4.3.');
            should.equal(error.help, 'Try upgrading your Ghost API client.');
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
            should.equal(error.statusCode, 406);
            should.equal(error.message, 'Request could not be served, the endpoint was not found.');
            should.equal(error.context, 'Provided client accept-version v4.8 is ahead of current Ghost version v4.3.');
            should.equal(error.help, 'Try upgrading your Ghost install.');
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
            should.equal(error.statusCode, 404);
            should.equal(error.message, 'Resource not found');
            done();
        });
    });

    describe('pageNotFound', function () {
        it('returns 404 with special message when message not set', function (done) {
            pageNotFound({}, {}, (error) => {
                should.equal(error.statusCode, 404);
                should.equal(error.message, 'Page not found');
                done();
            });
        });

        it('returns 404 with special message even if message is set', function (done) {
            pageNotFound({message: 'uh oh'}, {}, (error) => {
                should.equal(error.statusCode, 404);
                should.equal(error.message, 'Page not found');
                done();
            });
        });
    });
});
