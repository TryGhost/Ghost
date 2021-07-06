const should = require('should');
const sinon = require('sinon');
const fs = require('fs-extra');
const servePublicFile = require('../../../../../core/server/web/site/middleware/serve-public-file');

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
        const result = servePublicFile('robots.txt', 'text/plain', 3600);

        result.should.be.a.Function();
    });

    it('should skip if the request does NOT match the file', function () {
        const middleware = servePublicFile('robots.txt', 'text/plain', 3600);
        req.path = '/favicon.ico';
        middleware(req, res, next);
        next.called.should.be.true();
    });

    it('should load the file and send it', function () {
        const middleware = servePublicFile('robots.txt', 'text/plain', 3600);
        const body = 'User-agent: * Disallow: /';
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
        res.writeHead.args[0][0].should.equal(200);
        res.writeHead.calledWith(200, sinon.match.has('Content-Type')).should.be.true();
        res.writeHead.calledWith(200, sinon.match.has('Content-Length')).should.be.true();
        res.writeHead.calledWith(200, sinon.match.has('ETag')).should.be.true();
        res.writeHead.calledWith(200, sinon.match.has('Cache-Control', 'public, max-age=3600')).should.be.true();

        res.end.calledWith(body).should.be.true();
    });

    it('should send the correct headers', function () {
        const middleware = servePublicFile('robots.txt', 'text/plain', 3600);
        const body = 'User-agent: * Disallow: /';
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
        res.writeHead.args[0][0].should.equal(200);
        res.writeHead.calledWith(200, sinon.match.has('Content-Type')).should.be.true();
        res.writeHead.calledWith(200, sinon.match.has('Content-Length')).should.be.true();
        res.writeHead.calledWith(200, sinon.match.has('ETag')).should.be.true();
        res.writeHead.calledWith(200, sinon.match.has('Cache-Control', 'public, max-age=3600')).should.be.true();
    });

    it('should replace {{blog-url}} in text/plain', function () {
        const middleware = servePublicFile('robots.txt', 'text/plain', 3600);
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
});
