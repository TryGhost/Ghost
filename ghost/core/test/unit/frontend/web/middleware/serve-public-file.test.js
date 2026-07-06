const assert = require('node:assert/strict');
const sinon = require('sinon');
const request = require('supertest');
const express = require('express');
const fs = require('fs-extra');
const logging = require('@tryghost/logging');
const config = require('../../../../../core/shared/config');
const {servePublicFile} = require('../../../../../core/frontend/web/routers/serve-public-file');

function enoentError() {
    const err = new Error();
    err.code = 'ENOENT';
    return err;
}

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

        const fileStub = sinon.stub(fs, 'readFile').resolves(body);

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

        const fileStub = sinon.stub(fs, 'readFile').resolves(body);

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

        const fileStub = sinon.stub(fs, 'readFile').resolves(body);

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

        sinon.stub(fs, 'readFile').resolves(body);

        await request(app)
            .get('/robots.txt')
            .expect(200)
            .expect(`User-agent: ${config.get('url')}`);
    });

    it('should 404 for ENOENT on general files', async function () {
        const middleware = servePublicFile('static', 'robots.txt', 'text/plain', 3600);
        const app = createApp(middleware);

        const fileStub = sinon.stub(fs, 'readFile').rejects(enoentError());

        await request(app)
            .get('/robots.txt')
            .expect(404)
            .expect({
                errorType: 'NotFoundError',
                code: 'PUBLIC_FILE_NOT_FOUND',
                property: null
            });

        // No rebuild option: only a single read, no retry
        sinon.assert.calledOnce(fileStub);
    });

    it('can serve a built asset file as well as public files', async function () {
        const middleware = servePublicFile('built', 'something.css', 'text/css', 3600);
        const app = createApp(middleware);
        const body = '.foo {bar: baz}';

        const fileStub = sinon.stub(fs, 'readFile').resolves(body);

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

        const fileStub = sinon.stub(fs, 'readFile').resolves(body);

        const {text} = await request(app)
            .get('/public/private.min.js')
            .expect(200)
            .expect('Content-Type', /^application\/javascript/);

        assert.equal(text, body);
        assert(fileStub.firstCall.args[0].endsWith('core/frontend/public/private.min.js'));
    });

    it('does not memory-cache built files: every request reads from disk', async function () {
        const middleware = servePublicFile('built', 'cards.min.css', 'text/css', 3600);
        const app = createApp(middleware);
        const body = '.kg-card {}';

        const fileStub = sinon.stub(fs, 'readFile').resolves(body);

        const firstResponse = await request(app)
            .get('/cards.min.css')
            .expect(200);

        const secondResponse = await request(app)
            .get('/cards.min.css')
            .expect(200);

        // Built files are mutable at runtime, so they are read per request
        sinon.assert.calledTwice(fileStub);
        assert.equal(firstResponse.text, body);
        assert.equal(secondResponse.text, body);
        assert.match(firstResponse.headers.etag, /^".+"$/);
        assert.equal(firstResponse.headers['cache-control'], 'public, max-age=3600');
        assert.equal(secondResponse.headers.etag, firstResponse.headers.etag);
    });

    describe('rebuild recovery for built files', function () {
        it('rebuilds and serves the file when the first read is ENOENT', async function () {
            const body = '.kg-card {}';
            const rebuild = sinon.stub().resolves();
            const fileStub = sinon.stub(fs, 'readFile');
            fileStub.onFirstCall().rejects(enoentError());
            fileStub.onSecondCall().resolves(body);

            const middleware = servePublicFile('built', 'cards.min.css', 'text/css', 3600, {rebuild});
            const app = createApp(middleware);

            const {text} = await request(app)
                .get('/cards.min.css')
                .expect(200)
                .expect('Content-Type', /^text\/css/);

            assert.equal(text, body);
            sinon.assert.calledOnce(rebuild);
            sinon.assert.calledTwice(fileStub);
        });

        it('404s when the file is still missing after the rebuild, without retry loops', async function () {
            const rebuild = sinon.stub().resolves();
            const fileStub = sinon.stub(fs, 'readFile').rejects(enoentError());

            const middleware = servePublicFile('built', 'cards.min.css', 'text/css', 3600, {rebuild});
            const app = createApp(middleware);

            await request(app)
                .get('/cards.min.css')
                .expect(404)
                .expect({
                    errorType: 'NotFoundError',
                    code: 'PUBLIC_FILE_NOT_FOUND',
                    property: null
                });

            sinon.assert.calledOnce(rebuild);
            sinon.assert.calledTwice(fileStub);
        });

        it('logs and still 404s when the rebuild itself rejects', async function () {
            const loggingStub = sinon.stub(logging, 'error');
            const rebuildError = new Error('build failed');
            const rebuild = sinon.stub().rejects(rebuildError);
            sinon.stub(fs, 'readFile').rejects(enoentError());

            const middleware = servePublicFile('built', 'cards.min.css', 'text/css', 3600, {rebuild});
            const app = createApp(middleware);

            await request(app)
                .get('/cards.min.css')
                .expect(404)
                .expect({
                    errorType: 'NotFoundError',
                    code: 'PUBLIC_FILE_NOT_FOUND',
                    property: null
                });

            sinon.assert.calledOnce(rebuild);
            sinon.assert.calledOnceWithExactly(loggingStub, rebuildError);
        });

        it('never calls rebuild for static files', async function () {
            const rebuild = sinon.stub().resolves();
            const fileStub = sinon.stub(fs, 'readFile').rejects(enoentError());

            const middleware = servePublicFile('static', 'robots.txt', 'text/plain', 3600, {rebuild});
            const app = createApp(middleware);

            await request(app)
                .get('/robots.txt')
                .expect(404);

            sinon.assert.notCalled(rebuild);
            sinon.assert.calledOnce(fileStub);
        });

        it('passes non-ENOENT read errors through without rebuilding', async function () {
            const rebuild = sinon.stub().resolves();
            const err = new Error('boom');
            err.code = 'EACCES';
            sinon.stub(fs, 'readFile').rejects(err);

            const middleware = servePublicFile('built', 'cards.min.css', 'text/css', 3600, {rebuild});
            const app = createApp(middleware);

            await request(app)
                .get('/cards.min.css')
                .expect(500);

            sinon.assert.notCalled(rebuild);
        });
    });
});
