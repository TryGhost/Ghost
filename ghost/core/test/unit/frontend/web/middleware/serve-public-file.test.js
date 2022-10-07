const should = require('should');
const sinon = require('sinon');
const fs = require('fs-extra');
const path = require('path');
const servePublicFile = require('../../../../../core/frontend/web/middleware/serve-public-file');

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

        result.should.be.a.Function();
    });

    it('should skip if the request does NOT match the file', function () {
        const middleware = servePublicFile('static', 'robots.txt', 'text/plain', 3600);
        req.path = '/favicon.ico';
        middleware(req, res, next);
        next.called.should.be.true();
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

        next.called.should.be.false();
        fileStub.firstCall.args[0].should.endWith('core/frontend/public/robots.txt');
        res.writeHead.called.should.be.true();
        res.writeHead.args[0][0].should.equal(200);
        res.writeHead.calledWith(200, sinon.match.has('Content-Type')).should.be.true();
        res.writeHead.calledWith(200, sinon.match.has('Content-Length')).should.be.true();
        res.writeHead.calledWith(200, sinon.match.has('ETag')).should.be.true();
        res.writeHead.calledWith(200, sinon.match.has('Cache-Control', 'public, max-age=3600')).should.be.true();
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

        next.called.should.be.false();

        // File only gets read onece
        fileStub.calledOnce.should.be.true();
        fileStub.firstCall.args[0].should.endWith('core/frontend/public/robots.txt');

        // File gets served twice
        res.writeHead.calledTwice.should.be.true();
        res.writeHead.args[0][0].should.equal(200);
        res.writeHead.calledWith(200, sinon.match.has('Content-Type')).should.be.true();
        res.writeHead.calledWith(200, sinon.match.has('Content-Length')).should.be.true();
        res.writeHead.calledWith(200, sinon.match.has('ETag')).should.be.true();
        res.writeHead.calledWith(200, sinon.match.has('Cache-Control', 'public, max-age=3600')).should.be.true();
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

        fileStub.calledTwice.should.be.true();

        next.called.should.be.false();
        fileStub.firstCall.args[0].should.endWith('core/frontend/public/robots.txt');
        fileStub.secondCall.args[0].should.endWith('core/frontend/public/robots.txt');

        res.writeHead.calledThrice.should.be.true();
        res.writeHead.args[0][0].should.equal(200);
        res.writeHead.calledWith(200, sinon.match.has('Content-Type')).should.be.true();
        res.writeHead.calledWith(200, sinon.match.has('Content-Length')).should.be.true();
        res.writeHead.calledWith(200, sinon.match.has('ETag')).should.be.true();
        res.writeHead.calledWith(200, sinon.match.has('Cache-Control', 'public, max-age=3600')).should.be.true();
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
        next.called.should.be.false();
        res.writeHead.called.should.be.true();

        res.end.calledWith('User-agent: http://127.0.0.1:2369').should.be.true();
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

        next.called.should.be.true();
        next.calledWith(sinon.match({errorType: 'NotFoundError', code: 'PUBLIC_FILE_NOT_FOUND'})).should.be.true();
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

        next.called.should.be.false();
        res.writeHead.called.should.be.true();
        res.writeHead.args[0][0].should.equal(200);

        fileStub.firstCall.args[0].should.endWith('content/public/something.css');
    });
});
