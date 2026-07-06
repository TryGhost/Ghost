const assert = require('node:assert/strict');
const sinon = require('sinon');
const request = require('supertest');
const express = require('express');
const fs = require('fs-extra');
const logging = require('@tryghost/logging');
const config = require('../../../../../core/shared/config');
const {servePublicFile, createInMemoryAssetMiddleware} = require('../../../../../core/frontend/web/routers/serve-public-file');

describe('servePublicFile', function () {
    afterEach(function () {
        sinon.restore();
    });

    function createApp(middleware) {
        const app = express();
        app.use(middleware);
        app.use((_req, res) => {
            res.status(418).send('next');
        });
        app.use((err, _req, res, _next) => {
            void _next;

            res.status(err.statusCode || 500).json({
                errorType: err.errorType,
                code: err.code,
                property: err.property
            });
        });
        return app;
    }

    it('should return a middleware', function () {
        const result = servePublicFile('static', 'robots.txt', 'text/plain', 3600);

        assert.equal(typeof result, 'function');
    });

    it('should skip if the request does NOT match the file', async function () {
        const middleware = servePublicFile('static', 'robots.txt', 'text/plain', 3600);
        const app = createApp(middleware);

        await request(app)
            .get('/favicon.ico')
            .expect(418)
            .expect('next');
    });

    it('should load the file and send it with the correct headers', async function () {
        const middleware = servePublicFile('static', 'robots.txt', 'text/plain', 3600);
        const app = createApp(middleware);
        const body = 'User-agent: * Disallow: /';

        const fileStub = sinon.stub(fs, 'readFile').callsFake(function (file, cb) {
            cb(null, body);
        });

        const {headers, text} = await request(app)
            .get('/robots.txt')
            .expect(200);

        assert(fileStub.firstCall.args[0].endsWith('core/frontend/public/robots.txt'));
        assert.equal(text, body);
        assert.match(headers['content-type'], /^text\/plain/);
        assert.equal(headers['content-length'], `${Buffer.from(body).length}`);
        assert.match(headers.etag, /^".+"$/);
        assert.equal(headers['cache-control'], 'public, max-age=3600');
    });

    it('should send the file from the cache the second time', async function () {
        const middleware = servePublicFile('static', 'robots.txt', 'text/plain', 3600);
        const app = createApp(middleware);
        const body = 'User-agent: * Disallow: /';

        const fileStub = sinon.stub(fs, 'readFile').callsFake(function (file, cb) {
            cb(null, body);
        });

        const firstResponse = await request(app)
            .get('/robots.txt')
            .expect(200);

        const secondResponse = await request(app)
            .get('/robots.txt')
            .expect(200);

        // File only gets read once
        sinon.assert.calledOnce(fileStub);
        assert(fileStub.firstCall.args[0].endsWith('core/frontend/public/robots.txt'));

        // File gets served twice
        assert.equal(firstResponse.text, body);
        assert.equal(secondResponse.text, body);
        assert.match(firstResponse.headers['content-type'], /^text\/plain/);
        assert.equal(firstResponse.headers['content-length'], `${Buffer.from(body).length}`);
        assert.match(firstResponse.headers.etag, /^".+"$/);
        assert.equal(firstResponse.headers['cache-control'], 'public, max-age=3600');
        assert.equal(secondResponse.headers.etag, firstResponse.headers.etag);
        assert.equal(secondResponse.headers['cache-control'], 'public, max-age=3600');
    });

    it('should not cache files requested with a different v tag', async function () {
        const middleware = servePublicFile('static', 'robots.txt', 'text/plain', 3600);
        const app = createApp(middleware);
        const body = 'User-agent: * Disallow: /';

        const fileStub = sinon.stub(fs, 'readFile').callsFake(function (file, cb) {
            cb(null, body);
        });

        const firstResponse = await request(app)
            .get('/robots.txt?v=1')
            .expect(200);

        const secondResponse = await request(app)
            .get('/robots.txt?v=1')
            .expect(200);

        const thirdResponse = await request(app)
            .get('/robots.txt?v=2')
            .expect(200);

        sinon.assert.calledTwice(fileStub);

        assert(fileStub.firstCall.args[0].endsWith('core/frontend/public/robots.txt'));
        assert(fileStub.secondCall.args[0].endsWith('core/frontend/public/robots.txt'));

        assert.equal(firstResponse.text, body);
        assert.equal(secondResponse.text, body);
        assert.equal(thirdResponse.text, body);
        assert.match(firstResponse.headers['content-type'], /^text\/plain/);
        assert.equal(firstResponse.headers['content-length'], `${Buffer.from(body).length}`);
        assert.match(firstResponse.headers.etag, /^".+"$/);
        assert.equal(firstResponse.headers['cache-control'], 'public, max-age=3600');
    });

    it('should replace {{blog-url}} in text/plain', async function () {
        const middleware = servePublicFile('static', 'robots.txt', 'text/plain', 3600);
        const app = createApp(middleware);
        const body = 'User-agent: {{blog-url}}';

        sinon.stub(fs, 'readFile').callsFake(function (file, cb) {
            cb(null, body);
        });

        await request(app)
            .get('/robots.txt')
            .expect(200)
            .expect(`User-agent: ${config.get('url')}`);
    });

    it('should 404 for ENOENT on general files', async function () {
        const middleware = servePublicFile('static', 'robots.txt', 'text/plain', 3600);
        const app = createApp(middleware);

        sinon.stub(fs, 'readFile').callsFake(function (file, cb) {
            const err = new Error();
            err.code = 'ENOENT';
            cb(err, null);
        });

        await request(app)
            .get('/robots.txt')
            .expect(404)
            .expect({
                errorType: 'NotFoundError',
                code: 'PUBLIC_FILE_NOT_FOUND',
                property: null
            });
    });

    it('can serve a built asset file as well as public files', async function () {
        const middleware = servePublicFile('built', 'something.css', 'text/css', 3600);
        const app = createApp(middleware);
        const body = '.foo {bar: baz}';

        const fileStub = sinon.stub(fs, 'readFile').callsFake(function (file, cb) {
            cb(null, body);
        });

        const {text} = await request(app)
            .get('/something.css')
            .expect(200)
            .expect('Content-Type', /^text\/css/);

        assert.equal(text, body);
        assert(fileStub.firstCall.args[0].endsWith('/public/something.css'));
    });

    it('can serve the private page runtime asset from the static public directory', async function () {
        const middleware = servePublicFile('static', 'public/private.min.js', 'application/javascript', 3600);
        const app = createApp(middleware);
        const body = 'console.log("private");';

        const fileStub = sinon.stub(fs, 'readFile').callsFake(function (file, cb) {
            cb(null, body);
        });

        const {text} = await request(app)
            .get('/public/private.min.js')
            .expect(200)
            .expect('Content-Type', /^application\/javascript/);

        assert.equal(text, body);
        assert(fileStub.firstCall.args[0].endsWith('core/frontend/public/private.min.js'));
    });
});

describe('createInMemoryAssetMiddleware', function () {
    afterEach(function () {
        sinon.restore();
    });

    function createApp(middleware) {
        const app = express();
        app.use(middleware);
        app.use((_req, res) => {
            res.status(418).send('next');
        });
        app.use((err, _req, res, _next) => {
            void _next;

            res.status(err.statusCode || 500).json({
                errorType: err.errorType,
                code: err.code
            });
        });
        return app;
    }

    function createService({outputs = {}, ready = true} = {}) {
        const service = {
            ready,
            outputs,
            ensureLoaded: sinon.stub().callsFake(async function () {
                service.ready = true;
            }),
            getContent(filename) {
                return service.outputs[filename] ?? null;
            }
        };
        return service;
    }

    it('serves the content from the service with the correct headers', async function () {
        const body = '.card{color:#fff}';
        const service = createService({outputs: {'cards.min.css': body}});
        const middleware = createInMemoryAssetMiddleware(service, 'cards.min.css', 'text/css', 3600);
        const app = createApp(middleware);

        const {headers, text} = await request(app)
            .get('/public/cards.min.css')
            .expect(200);

        assert.equal(text, body);
        assert.match(headers['content-type'], /^text\/css/);
        assert.equal(headers['content-length'], `${Buffer.from(body).length}`);
        assert.match(headers.etag, /^".+"$/);
        assert.equal(headers['cache-control'], 'public, max-age=3600');
        sinon.assert.notCalled(service.ensureLoaded);
    });

    it('triggers a build when the service is not ready', async function () {
        const service = createService({outputs: {}, ready: false});
        service.ensureLoaded.callsFake(async function () {
            service.ready = true;
            service.outputs = {'cards.min.js': 'console.log("built");'};
        });
        const middleware = createInMemoryAssetMiddleware(service, 'cards.min.js', 'application/javascript', 3600);
        const app = createApp(middleware);

        const {text} = await request(app)
            .get('/public/cards.min.js')
            .expect(200);

        assert.equal(text, 'console.log("built");');
        sinon.assert.calledOnce(service.ensureLoaded);
    });

    it('replaces {{blog-url}} in javascript assets', async function () {
        const service = createService({outputs: {'cards.min.js': 'const url = "{{blog-url}}";'}});
        const middleware = createInMemoryAssetMiddleware(service, 'cards.min.js', 'application/javascript', 3600);
        const app = createApp(middleware);

        const siteUrl = config.get('url').replace(/\/$/, '');

        await request(app)
            .get('/public/cards.min.js')
            .expect(200)
            .expect(`const url = "${siteUrl}";`);
    });

    it('does not replace {{blog-url}} in css assets', async function () {
        const service = createService({outputs: {'cards.min.css': '/* {{blog-url}} */'}});
        const middleware = createInMemoryAssetMiddleware(service, 'cards.min.css', 'text/css', 3600);
        const app = createApp(middleware);

        await request(app)
            .get('/public/cards.min.css')
            .expect(200)
            .expect('/* {{blog-url}} */');
    });

    it('404s when the content is absent after a build', async function () {
        const service = createService({outputs: {}, ready: false});
        const middleware = createInMemoryAssetMiddleware(service, 'cards.min.css', 'text/css', 3600);
        const app = createApp(middleware);

        await request(app)
            .get('/public/cards.min.css')
            .expect(404)
            .expect({
                errorType: 'NotFoundError',
                code: 'PUBLIC_FILE_NOT_FOUND'
            });

        sinon.assert.calledOnce(service.ensureLoaded);
    });

    it('404s (and logs) instead of hanging when the build fails', async function () {
        const loggingStub = sinon.stub(logging, 'error');
        const buildError = new Error('build failed');
        const service = createService({outputs: {}, ready: false});
        service.ensureLoaded.rejects(buildError);
        const middleware = createInMemoryAssetMiddleware(service, 'cards.min.css', 'text/css', 3600);
        const app = createApp(middleware);

        await request(app)
            .get('/public/cards.min.css')
            .expect(404)
            .expect({
                errorType: 'NotFoundError',
                code: 'PUBLIC_FILE_NOT_FOUND'
            });

        sinon.assert.calledOnceWithExactly(loggingStub, buildError);
    });

    it('still serves stale content when a rebuild fails', async function () {
        sinon.stub(logging, 'error');
        const service = createService({outputs: {'cards.min.css': '.stale{}'}, ready: false});
        service.ensureLoaded.rejects(new Error('rebuild failed'));
        const middleware = createInMemoryAssetMiddleware(service, 'cards.min.css', 'text/css', 3600);
        const app = createApp(middleware);

        await request(app)
            .get('/public/cards.min.css')
            .expect(200)
            .expect('.stale{}');
    });

    it('serves updated content (with a new ETag) after a rebuild', async function () {
        const service = createService({outputs: {'cards.min.css': '.one{}'}});
        const middleware = createInMemoryAssetMiddleware(service, 'cards.min.css', 'text/css', 3600);
        const app = createApp(middleware);

        const firstResponse = await request(app)
            .get('/public/cards.min.css')
            .expect(200)
            .expect('.one{}');

        const secondResponse = await request(app)
            .get('/public/cards.min.css')
            .expect(200)
            .expect('.one{}');

        assert.equal(secondResponse.headers.etag, firstResponse.headers.etag);

        // Simulate a rebuild (e.g. theme change) producing new content
        service.outputs = {'cards.min.css': '.two{}'};

        const thirdResponse = await request(app)
            .get('/public/cards.min.css')
            .expect(200)
            .expect('.two{}');

        assert.notEqual(thirdResponse.headers.etag, firstResponse.headers.etag);
        assert.equal(thirdResponse.headers['content-length'], `${Buffer.from('.two{}').length}`);
    });
});
