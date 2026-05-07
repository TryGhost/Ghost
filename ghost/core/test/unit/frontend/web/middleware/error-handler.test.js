const assert = require('node:assert/strict');
const express = require('express');
const request = require('supertest');
const errors = require('@tryghost/errors');

const {handleThemeResponse} = require('../../../../../core/frontend/web/middleware/error-handler');

describe('Frontend Error Handler', function () {
    // The themeErrorRenderer is the last middleware in the handleThemeResponse array
    const themeErrorRenderer = handleThemeResponse[handleThemeResponse.length - 1];

    function createApp(err, options = {}) {
        const app = express();

        if (options.renderHtml || options.renderError) {
            app.engine('hbs', (template, data, callback) => {
                if (options.renderError) {
                    return callback(options.renderError);
                }

                return callback(null, options.renderHtml);
            });
            app.set('view engine', 'hbs');
        }

        app.use((req, res, next) => {
            res.locals.staticFileFallthrough = false;
            res.statusCode = err.statusCode || res.statusCode;
            req.err = err;
            next(err);
        });
        app.use(themeErrorRenderer);

        return app;
    }

    describe('themeErrorRenderer', function () {
        it('should return plain text for STATIC_FILE_NOT_FOUND errors', async function () {
            const err = {
                statusCode: 404,
                code: 'STATIC_FILE_NOT_FOUND',
                message: 'File not found'
            };

            await request(createApp(err))
                .get('/assets/missing.css')
                .expect(404)
                .expect('Content-Type', /text\/plain/)
                .expect('File not found');
        });

        it('should return plain text for paths with file extensions', async function () {
            const err = {
                statusCode: 404,
                message: 'Not found'
            };

            await request(createApp(err))
                .get('/images/missing.png')
                .expect(404)
                .expect('Content-Type', /text\/plain/)
                .expect('File not found');
        });

        it('should set default message for static 404s without message', async function () {
            const err = {
                statusCode: 404
            };

            await request(createApp(err))
                .get('/assets/style.css')
                .expect(404)
                .expect('Content-Type', /text\/plain/)
                .expect('File not found');
        });

        it('should return plain text for non-404 errors for static files', async function () {
            const err = {
                statusCode: 500,
                message: 'Server error'
            };

            await request(createApp(err))
                .get('/assets/script.js')
                .expect(500)
                .expect('Content-Type', /text\/plain/)
                .expect('The server has encountered an error.');
        });

        it('should convert 404 errors to Ghost NotFoundError for static files', async function () {
            const err = {
                statusCode: 404,
                path: '/assets/missing.css'
            };

            await request(createApp(err))
                .get('/assets/missing.css')
                .expect(404)
                .expect('Content-Type', /text\/plain/)
                .expect('File not found');
        });

        it('should override message for already-converted NotFoundError for static files', async function () {
            const err = new errors.NotFoundError({
                message: 'Resource could not be found.'
            });

            await request(createApp(err))
                .get('/assets/missing.css')
                .expect(404)
                .expect('Content-Type', /text\/plain/)
                .expect('File not found');
        });

        it('should handle errors with STATIC_FILE_NOT_FOUND code from servePublicFile', async function () {
            const err = new errors.NotFoundError({
                message: 'Image not found',
                code: 'STATIC_FILE_NOT_FOUND',
                property: '/content/public/ghost.css'
            });

            await request(createApp(err))
                .get('/ghost.css')
                .expect(404)
                .expect('Content-Type', /text\/plain/)
                .expect('Image not found');
        });

        it('should convert 400 errors to Ghost BadRequestError for static files', async function () {
            const err = {
                statusCode: 400,
                message: 'Bad request'
            };

            await request(createApp(err))
                .get('/assets/test.js')
                .expect(400)
                .expect('Content-Type', /text\/plain/)
                .expect('The request could not be understood.');
        });

        it('should convert 403 errors to Ghost NoPermissionError for static files', async function () {
            const err = {
                statusCode: 403,
                message: 'Forbidden'
            };

            await request(createApp(err))
                .get('/assets/private.css')
                .expect(403)
                .expect('Content-Type', /text\/plain/)
                .expect('You do not have permission to perform this request.');
        });

        it('should handle RangeNotSatisfiableError properly', async function () {
            const err = {
                name: 'RangeNotSatisfiableError',
                message: 'Range not satisfiable'
            };

            await request(createApp(err))
                .get('/assets/video.mp4')
                .expect(416)
                .expect('Content-Type', /text\/plain/)
                .expect('Range not satisfiable for provided Range header.');
        });

        it('should render HTML for paths without extensions', async function () {
            const err = {
                statusCode: 404,
                message: 'Page not found'
            };
            const mockHtml = '<html>404 page</html>';

            await request(createApp(err, {renderHtml: mockHtml}))
                .get('/missing-page')
                .expect(404)
                .expect('Content-Type', /html/)
                .expect(mockHtml);
        });

        it('should render HTML for paths with trailing slash', async function () {
            const err = {
                statusCode: 404,
                message: 'Page not found'
            };
            const mockHtml = '<html>404 page</html>';

            await request(createApp(err, {renderHtml: mockHtml}))
                .get('/missing-page/')
                .expect(404)
                .expect('Content-Type', /html/)
                .expect(mockHtml);
        });

        it('should handle render failures gracefully', async function () {
            const err = {
                statusCode: 404,
                message: 'Page not found'
            };
            const renderError = new Error('Template rendering failed');

            const response = await request(createApp(err, {renderError}))
                .get('/missing')
                .expect(500);

            assert(response.text.includes('Oops, seems there is an error in the error template'));
            assert(response.text.includes('Template rendering failed'));
        });
    });
});
