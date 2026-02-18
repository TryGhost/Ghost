const assert = require('node:assert/strict');
const sinon = require('sinon');
const fs = require('fs-extra');
const config = require('../../../../../core/shared/config');
const {servePublicFile} = require('../../../../../core/frontend/web/routers/serve-public-file');

describe('servePublicFile', function () {
    let res;
    let req;
    let next;

    beforeEach(function () {
        res = sinon.spy();
        req = sinon.spy();
        next = sinon.spy();
    });

    afterEach(function () {
        sinon.restore();
    });

    it('should return a middleware', function () {
        const result = servePublicFile('static', 'robots.txt', 'text/plain', 3600);

        assert.equal(typeof result, 'function');
    });

    it('should skip if the request does NOT match the file', function () {
        const middleware = servePublicFile('static', 'robots.txt', 'text/plain', 3600);
        req.path = '/favicon.ico';
        middleware(req, res, next);
        assert.equal(next.called, true);
    });

    it('should load the file and send it with the correct headers', function () {
        const middleware = servePublicFile('static', 'robots.txt', 'text/plain', 3600);
        const body = 'User-agent: * Disallow: /';
        req.path = '/robots.txt';

        let fileStub = sinon.stub(fs, 'readFile').callsFake(function (file, cb) {
            cb(null, body);
        });

        res = {
            writeHead: sinon.spy(),
            end: sinon.spy()
        };

        middleware(req, res, next);

        assert.equal(next.called, false);
        assert(fileStub.firstCall.args[0].endsWith('core/frontend/public/robots.txt'));
        assert.equal(res.writeHead.called, true);
        assert.equal(res.writeHead.args[0][0], 200);
        assert.equal(res.writeHead.calledWith(200, sinon.match.has('Content-Type')), true);
        assert.equal(res.writeHead.calledWith(200, sinon.match.has('Content-Length')), true);
        assert.equal(res.writeHead.calledWith(200, sinon.match.has('ETag')), true);
        assert.equal(res.writeHead.calledWith(200, sinon.match.has('Cache-Control', 'public, max-age=3600')), true);
    });

    it('should send the file from the cache the second time', function () {
        const middleware = servePublicFile('static', 'robots.txt', 'text/plain', 3600);
        const body = 'User-agent: * Disallow: /';
        req.path = '/robots.txt';

        let fileStub = sinon.stub(fs, 'readFile').callsFake(function (file, cb) {
            cb(null, body);
        });

        res = {
            writeHead: sinon.spy(),
            end: sinon.spy()
        };

        middleware(req, res, next);
        middleware(req, res, next);

        assert.equal(next.called, false);

        // File only gets read onece
        assert.equal(fileStub.calledOnce, true);
        assert(fileStub.firstCall.args[0].endsWith('core/frontend/public/robots.txt'));

        // File gets served twice
        assert.equal(res.writeHead.calledTwice, true);
        assert.equal(res.writeHead.args[0][0], 200);
        assert.equal(res.writeHead.calledWith(200, sinon.match.has('Content-Type')), true);
        assert.equal(res.writeHead.calledWith(200, sinon.match.has('Content-Length')), true);
        assert.equal(res.writeHead.calledWith(200, sinon.match.has('ETag')), true);
        assert.equal(res.writeHead.calledWith(200, sinon.match.has('Cache-Control', 'public, max-age=3600')), true);
    });

    it('should not cache files requested with a different v tag', function () {
        const middleware = servePublicFile('static', 'robots.txt', 'text/plain', 3600);
        const body = 'User-agent: * Disallow: /';
        req.path = '/robots.txt';
        req.query = {v: 1};

        let fileStub = sinon.stub(fs, 'readFile').callsFake(function (file, cb) {
            cb(null, body);
        });

        res = {
            writeHead: sinon.spy(),
            end: sinon.spy()
        };

        middleware(req, res, next);
        middleware(req, res, next);

        // Set a different cache key
        req.query = {v: 2};
        middleware(req, res, next);

        assert.equal(fileStub.calledTwice, true);

        assert.equal(next.called, false);
        assert(fileStub.firstCall.args[0].endsWith('core/frontend/public/robots.txt'));
        assert(fileStub.secondCall.args[0].endsWith('core/frontend/public/robots.txt'));

        assert.equal(res.writeHead.calledThrice, true);
        assert.equal(res.writeHead.args[0][0], 200);
        assert.equal(res.writeHead.calledWith(200, sinon.match.has('Content-Type')), true);
        assert.equal(res.writeHead.calledWith(200, sinon.match.has('Content-Length')), true);
        assert.equal(res.writeHead.calledWith(200, sinon.match.has('ETag')), true);
        assert.equal(res.writeHead.calledWith(200, sinon.match.has('Cache-Control', 'public, max-age=3600')), true);
    });

    it('should replace {{blog-url}} in text/plain', function () {
        const middleware = servePublicFile('static', 'robots.txt', 'text/plain', 3600);
        const body = 'User-agent: {{blog-url}}';
        req.path = '/robots.txt';

        sinon.stub(fs, 'readFile').callsFake(function (file, cb) {
            cb(null, body);
        });

        res = {
            writeHead: sinon.spy(),
            end: sinon.spy()
        };

        middleware(req, res, next);
        assert.equal(next.called, false);
        assert.equal(res.writeHead.called, true);

        assert.equal(res.end.calledWith(`User-agent: ${config.get('url')}`), true);
    });

    it('should 404 for ENOENT on general files', function () {
        const middleware = servePublicFile('static', 'robots.txt', 'text/plain', 3600);
        req.path = '/robots.txt';

        sinon.stub(fs, 'readFile').callsFake(function (file, cb) {
            const err = new Error();
            err.code = 'ENOENT';
            cb(err, null);
        });

        res = {
            writeHead: sinon.spy(),
            end: sinon.spy()
        };

        middleware(req, res, next);

        assert.equal(next.called, true);
        assert.equal(next.calledWith(sinon.match({errorType: 'NotFoundError', code: 'PUBLIC_FILE_NOT_FOUND'})), true);
    });

    it('can serve a built asset file as well as public files', function () {
        const middleware = servePublicFile('built', 'something.css', 'text/css', 3600);
        const body = '.foo {bar: baz}';
        req.path = '/something.css';

        let fileStub = sinon.stub(fs, 'readFile').callsFake(function (file, cb) {
            cb(null, body);
        });

        res = {
            writeHead: sinon.spy(),
            end: sinon.spy()
        };

        middleware(req, res, next);

        assert.equal(next.called, false);
        assert.equal(res.writeHead.called, true);
        assert.equal(res.writeHead.args[0][0], 200);

        assert(fileStub.firstCall.args[0].endsWith('/public/something.css'));
    });
});
