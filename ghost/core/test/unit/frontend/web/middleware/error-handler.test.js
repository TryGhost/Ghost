const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const express = require('express');
const request = require('supertest');
const sinon = require('sinon');
const errors = require('@tryghost/errors');

const {handleThemeResponse} = require('../../../../../core/frontend/web/middleware/error-handler');
const themeEngine = require('../../../../../core/frontend/services/theme-engine');

describe('Frontend Error Handler', function () {
    // The themeErrorRenderer is the last middleware in the handleThemeResponse array
    const themeErrorRenderer = handleThemeResponse[handleThemeResponse.length - 1];

    function createApp(err, options = {}) {
        const app = express();

        if (options.renderHtml || options.renderError) {
            app.engine('hbs', (template, data, callback) => {
                if (options.renderError) {
                    callback(options.renderError);
                } else {
                    callback(null, options.renderHtml);
                }
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

    // Regression tests for: an error thrown before the theme middleware mounts the theme
    // (e.g. early in the request pipeline / first requests after boot) reaching the error
    // renderer with an unmounted theme. Previously this resolved a theme-specific error
    // template name (e.g. `error-404`) against Ghost's *default* views directory, producing
    // `Failed to lookup view "error-404"` -> HTTP 500 (and permanently repointing the app's
    // views dir). The renderer now renders Ghost's self-contained built-in error template
    // whenever the theme isn't mounted (its engine/views and template data aren't set up),
    // and only renders theme error templates when the theme is genuinely mounted.
    describe('built-in error fallback when the active theme is not mounted', function () {
        let themeDir;

        beforeEach(function () {
            // a throwaway "theme" dir with a real, self-contained error-404 template
            themeDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ghost-theme-err-'));
            fs.writeFileSync(
                path.join(themeDir, 'error-404.hbs'),
                '<div class="themed-error">{{statusCode}} — {{message}}</div>'
            );
        });

        afterEach(function () {
            sinon.restore();
            fs.rmSync(themeDir, {recursive: true, force: true});
        });

        const errorTemplates = ['error-404', 'error-4xx', 'error'];

        // One app instance whose theme is NOT mounted (no hbs engine / views configured),
        // funnelling a fresh 404 into the theme error renderer on each request — mirrors the
        // post-boot, pre-theme-middleware state.
        function createUnmountedSiteApp() {
            const app = express();
            app.use((req, res, next) => {
                const err = {statusCode: 404, message: 'Page not found'};
                res.statusCode = 404;
                req.err = err;
                next(err);
            });
            app.use(themeErrorRenderer);
            return app;
        }

        it('renders the built-in error template (not the theme template) when the theme is not mounted', async function () {
            // theme HAS error-404 but is NOT mounted (error thrown before theme middleware ran)
            sinon.stub(themeEngine, 'getActive').returns({
                mounted: false,
                hasTemplate: name => errorTemplates.includes(name)
            });

            const res = await request(createUnmountedSiteApp())
                .get('/missing-page')
                .expect(404);

            assert.doesNotMatch(res.text, /Failed to lookup view/);
            assert.doesNotMatch(res.text, /themed-error/); // not the theme template
            assert.match(res.text, /error-code/); // built-in template markup
        });

        it('does not 500 or repoint the global views dir across repeated early errors (regression)', async function () {
            sinon.stub(themeEngine, 'getActive').returns({
                mounted: false,
                hasTemplate: name => errorTemplates.includes(name)
            });

            const app = createUnmountedSiteApp();

            // First request previously armed the fallback (registering an engine + repointing
            // views), which then made the second request resolve `error-404` against the wrong
            // directory: `Failed to lookup view "error-404"` -> HTTP 500.
            await request(app).get('/missing-one').expect(404);
            const res = await request(app).get('/missing-two').expect(404);

            assert.doesNotMatch(res.text, /Failed to lookup view/);
            // the fallback must not repoint the app-wide views dir to Ghost's default views
            assert.doesNotMatch(app.get('views') || '', /core[/\\]server[/\\]views/);
        });

        it('falls back to the built-in error template without repointing the global views dir when there is no active theme', async function () {
            sinon.stub(themeEngine, 'getActive').returns(undefined);

            const app = createUnmountedSiteApp();
            const res = await request(app).get('/missing-page').expect(404);

            assert.doesNotMatch(res.text, /Failed to lookup view/);
            assert.doesNotMatch(app.get('views') || '', /core[/\\]server[/\\]views/);
        });

        it('registers the hbs engine for the built-in fallback even if another engine is already registered', async function () {
            sinon.stub(themeEngine, 'getActive').returns(undefined);

            const app = express();
            // a non-hbs engine is registered, but hbs is not — the fallback must still register
            // hbs (checking req.app.engines emptiness instead would skip it and 500)
            app.engine('ejs', (filePath, options, cb) => cb(null, 'ejs output'));
            app.use((req, res, next) => {
                const err = {statusCode: 404, message: 'Page not found'};
                res.statusCode = 404;
                req.err = err;
                next(err);
            });
            app.use(themeErrorRenderer);

            const res = await request(app).get('/missing-page').expect(404);

            assert.doesNotMatch(res.text, /Failed to lookup view/);
            assert.match(res.text, /error-code/); // built-in template rendered via the hbs engine
        });

        it('still renders the theme error template when the theme IS mounted', async function () {
            sinon.stub(themeEngine, 'getActive').returns({
                mounted: true,
                hasTemplate: name => errorTemplates.includes(name)
            });

            // mimic a mounted theme: real hbs engine + views pointed at the theme dir
            const expressHbs = require('express-hbs');
            const app = express();
            app.engine('hbs', expressHbs.create().express4());
            app.set('view engine', 'hbs');
            app.set('views', themeDir);
            app.use((req, res, next) => {
                const err = {statusCode: 404, message: 'Page not found'};
                res.statusCode = 404;
                req.err = err;
                next(err);
            });
            app.use(themeErrorRenderer);

            const res = await request(app).get('/missing-page').expect(404);

            assert.match(res.text, /themed-error/);
            assert.match(res.text, /404 — Page not found/);
            assert.doesNotMatch(res.text, /Failed to lookup view/);
        });
    });
});
