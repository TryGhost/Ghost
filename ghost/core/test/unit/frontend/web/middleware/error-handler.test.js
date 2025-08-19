const should = require('should');
const sinon = require('sinon');
const errors = require('@tryghost/errors');

const {handleThemeResponse} = require('../../../../../core/frontend/web/middleware/error-handler');

describe('Frontend Error Handler', function () {
    let req;
    let res;
    let next;

    beforeEach(function () {
        req = {
            path: '/',
            err: null,
            app: {
                engines: {},
                engine: sinon.stub(),
                set: sinon.stub()
            }
        };
        res = {
            status: sinon.stub().returnsThis(),
            send: sinon.stub(),
            render: sinon.stub(),
            setHeader: sinon.stub(),
            type: sinon.stub().returnsThis(),
            _template: null,
            statusCode: 404,
            locals: {
                staticFileFallthrough: false
            }
        };
        next = sinon.stub();
    });

    afterEach(function () {
        sinon.restore();
    });

    // Helper functions to reduce assertion duplication
    function assertPlainTextResponse(response, statusCode, message) {
        response.status.calledOnceWithExactly(statusCode).should.be.true();
        response.type.calledOnceWithExactly('text/plain').should.be.true();
        response.send.calledOnce.should.be.true();
        response.send.firstCall.args[0].should.equal(message);
        response.render.called.should.be.false();
    }

    function assertHtmlResponse(response, expectedHtml) {
        response.render.calledOnce.should.be.true();
        response.send.calledOnceWithExactly(expectedHtml).should.be.true();
        response.status.called.should.be.false();
        response.type.called.should.be.false();
    }

    describe('themeErrorRenderer', function () {
        // The themeErrorRenderer is the last middleware in the handleThemeResponse array
        const themeErrorRenderer = handleThemeResponse[handleThemeResponse.length - 1];

        it('should return plain text for STATIC_FILE_NOT_FOUND errors', async function () {
            const err = {
                statusCode: 404,
                code: 'STATIC_FILE_NOT_FOUND',
                message: 'File not found'
            };
            req.path = '/assets/missing.css';

            await themeErrorRenderer(err, req, res, next);

            assertPlainTextResponse(res, 404, 'File not found');
        });

        it('should return plain text for paths with file extensions', async function () {
            const err = {
                statusCode: 404,
                message: 'Not found'
            };
            req.path = '/images/missing.png';

            await themeErrorRenderer(err, req, res, next);

            assertPlainTextResponse(res, 404, 'File not found');
        });

        it('should set default message for static 404s without message', async function () {
            const err = {
                statusCode: 404
            };
            req.path = '/assets/style.css';

            await themeErrorRenderer(err, req, res, next);

            assertPlainTextResponse(res, 404, 'File not found');
        });

        it('should return plain text for non-404 errors for static files', async function () {
            const err = {
                statusCode: 500,
                message: 'Server error'
            };
            req.path = '/assets/script.js';

            await themeErrorRenderer(err, req, res, next);

            assertPlainTextResponse(res, 500, 'The server has encountered an error.');
        });

        it('should convert 404 errors to Ghost NotFoundError for static files', async function () {
            const err = {
                statusCode: 404,
                path: '/assets/missing.css'
            };
            req.path = '/assets/missing.css';

            await themeErrorRenderer(err, req, res, next);

            assertPlainTextResponse(res, 404, 'File not found');
        });

        it('should override message for already-converted NotFoundError for static files', async function () {
            const err = new errors.NotFoundError({
                message: 'Resource could not be found.'
            });
            req.path = '/assets/missing.css';
            res.locals = {
                staticFileFallthrough: false
            };

            await themeErrorRenderer(err, req, res, next);

            assertPlainTextResponse(res, 404, 'File not found');
        });

        it('should handle errors with STATIC_FILE_NOT_FOUND code from servePublicFile', async function () {
            const err = new errors.NotFoundError({
                message: 'Image not found',
                code: 'STATIC_FILE_NOT_FOUND',
                property: '/content/public/ghost.css'
            });
            req.path = '/ghost.css';

            await themeErrorRenderer(err, req, res, next);

            assertPlainTextResponse(res, 404, 'Image not found');
        });

        it('should convert 400 errors to Ghost BadRequestError for static files', async function () {
            const err = {
                statusCode: 400,
                message: 'Bad request'
            };
            req.path = '/assets/test.js';

            await themeErrorRenderer(err, req, res, next);

            assertPlainTextResponse(res, 400, 'The request could not be understood.');
        });

        it('should convert 403 errors to Ghost NoPermissionError for static files', async function () {
            const err = {
                statusCode: 403,
                message: 'Forbidden'
            };
            req.path = '/assets/private.css';

            await themeErrorRenderer(err, req, res, next);

            assertPlainTextResponse(res, 403, 'You do not have permission to perform this request.');
        });

        it('should handle RangeNotSatisfiableError properly', async function () {
            const err = {
                name: 'RangeNotSatisfiableError',
                message: 'Range not satisfiable'
            };
            req.path = '/assets/video.mp4';

            await themeErrorRenderer(err, req, res, next);

            assertPlainTextResponse(res, 416, 'Range not satisfiable for provided Range header.');
        });

        it('should render HTML for paths without extensions', async function () {
            const err = {
                statusCode: 404,
                message: 'Page not found'
            };
            const mockHtml = '<html>404 page</html>';
            req.path = '/missing-page';
            req.err = err;
            res.render.callsFake((template, data, callback) => {
                callback(null, mockHtml);
            });

            await themeErrorRenderer(err, req, res, next);

            assertHtmlResponse(res, mockHtml);
            next.called.should.be.false();
        });

        it('should render HTML for paths with trailing slash', async function () {
            const err = {
                statusCode: 404,
                message: 'Page not found'
            };
            const mockHtml = '<html>404 page</html>';
            req.path = '/missing-page/';
            req.err = err;
            res.render.callsFake((template, data, callback) => {
                callback(null, mockHtml);
            });

            await themeErrorRenderer(err, req, res, next);

            assertHtmlResponse(res, mockHtml);
            next.called.should.be.false();
        });

        it('should handle render failures gracefully', async function () {
            const err = {
                statusCode: 404,
                message: 'Page not found'
            };
            const renderError = new Error('Template rendering failed');
            req.path = '/missing';
            req.err = err;
            res.render.callsFake((template, data, callback) => {
                callback(renderError);
            });

            await themeErrorRenderer(err, req, res, next);

            res.render.calledOnce.should.be.true();
            res.status.calledOnceWithExactly(500).should.be.true();
            res.send.calledOnce.should.be.true();
            
            const errorHtml = res.send.firstCall.args[0];
            errorHtml.should.containEql('Oops, seems there is an error in the error template');
            errorHtml.should.containEql('Template rendering failed');
        });
    });
});