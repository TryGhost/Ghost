// Switch these lines once there are useful utils
// const testUtils = require('./utils');
require('./utils');
const should = require('should');
const {InternalServerError} = require('@tryghost/errors');
const {
    prepareError,
    handleJSONResponse,
    handleJSONResponseV2,
    handleHTMLResponse,
    prepareStack,
    resourceNotFound
} = require('../');

describe('Prepare Error', function () {
    it('Correctly prepares a normal error', function (done) {
        prepareError(new Error('test!'), {}, {
            set: () => {}
        }, (err) => {
            err.statusCode.should.eql(500);
            err.name.should.eql('InternalServerError');
            err.stack.should.startWith('Error: test!');
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

describe('Error renderers', function () {
    it('Renders JSON', function (done) {
        const errorRenderer = handleJSONResponse({
            errorHandler: () => {}
        })[3];

        errorRenderer(new Error('test!'), {}, {
            json: (data) => {
                data.errors.length.should.eql(1);
                data.errors[0].message.should.eql('test!');
                done();
            }
        }, () => {});
    });

    it('Renders JSON for v2', function (done) {
        const errorRenderer = handleJSONResponseV2({
            errorHandler: () => {}
        })[3];

        errorRenderer(new Error('test!'), {}, {
            json: (data) => {
                data.errors.length.should.eql(1);
                data.errors[0].message.should.eql('test!');
                done();
            }
        }, () => {});
    });

    it('Handles unknown errors when preparing user message', function (done) {
        const errorRenderer = handleJSONResponseV2({
            errorHandler: () => {}
        })[3];

        errorRenderer(new RangeError('test!'), {
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
        const errorRenderer = handleJSONResponseV2({
            errorHandler: () => {}
        })[3];

        errorRenderer(new InternalServerError({
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
                done();
            }
        }, () => {});
    });

    it('Exports the HTML renderer', function () {
        const renderer = handleHTMLResponse({
            errorHandler: () => {}
        });

        renderer.length.should.eql(3);
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
});
