/*globals describe, it, beforeEach, afterEach */
var sinon = require('sinon'),
    should = require('should'),
    cors = require('../../../server/middleware/cors');

describe('cors', function () {
    var res, req, next, sandbox;

    beforeEach(function () {
        sandbox = sinon.sandbox.create();

        req = {
            headers: {
                origin: null
            },
            client: {
                trustedDomains: []
            }
        };

        res = {
            headers: {},
            getHeader: function () {},
            setHeader: function (h, v) {
                this.headers[h] = v;
            }
        };

        next = sandbox.spy();
    });

    afterEach(function () {
        sandbox.restore();
    });

    it('should not be enabled without a request origin header', function (done) {
        req.get = sinon.stub().withArgs('origin').returns(null);

        cors(req, res, next);

        next.called.should.be.true();
        should.not.exist(res.headers['Access-Control-Allow-Origin']);

        done();
    });

    it('should be enabled when origin is 127.0.0.1', function (done) {
        var origin = 'http://127.0.0.1:2368';

        req.get = sinon.stub().withArgs('origin').returns(origin);
        res.get = sinon.stub().withArgs('origin').returns(origin);
        req.headers.origin = origin;

        cors(req, res, next);

        next.called.should.be.true();
        res.headers['Access-Control-Allow-Origin'].should.equal(origin);

        done();
    });

    it('should be enabled when origin is localhost', function (done) {
        var origin = 'http://localhost:2368';

        req.get = sinon.stub().withArgs('origin').returns(origin);
        res.get = sinon.stub().withArgs('origin').returns(origin);
        req.headers.origin = origin;

        cors(req, res, next);

        next.called.should.be.true();
        res.headers['Access-Control-Allow-Origin'].should.equal(origin);

        done();
    });

    it('should be enabled when origin is a client_trusted_domain', function (done) {
        var origin = 'http://my-trusted-domain.com';

        req.client.trustedDomains.push({trusted_domain: origin});
        req.get = sinon.stub().withArgs('origin').returns(origin);
        res.get = sinon.stub().withArgs('origin').returns(origin);
        req.headers.origin = origin;

        cors(req, res, next);

        next.called.should.be.true();
        res.headers['Access-Control-Allow-Origin'].should.equal(origin);

        done();
    });

    it('should be enabled when there are multiple trusted domains', function (done) {
        var origin = 'http://my-other-trusted-domain.com';

        req.client.trustedDomains.push({trusted_domain: origin});
        req.client.trustedDomains.push({trusted_domain: 'http://my-trusted-domain.com'});
        req.get = sinon.stub().withArgs('origin').returns(origin);
        res.get = sinon.stub().withArgs('origin').returns(origin);
        req.headers.origin = origin;

        cors(req, res, next);

        next.called.should.be.true();
        res.headers['Access-Control-Allow-Origin'].should.equal(origin);

        done();
    });

    it('should not be enabled the origin is not trusted or whitelisted', function (done) {
        var origin = 'http://not-trusted.com';

        req.client.trustedDomains.push({trusted_domain: 'http://example.com'});
        req.get = sinon.stub().withArgs('origin').returns(origin);
        res.get = sinon.stub().withArgs('origin').returns(origin);
        req.headers.origin = origin;

        cors(req, res, next);

        next.called.should.be.true();
        should.not.exist(res.headers['Access-Control-Allow-Origin']);

        done();
    });

    it('should not be enabled the origin client_trusted_domains is empty', function (done) {
        var origin = 'http://example.com';

        req.get = sinon.stub().withArgs('origin').returns(origin);
        res.get = sinon.stub().withArgs('origin').returns(origin);
        req.headers.origin = origin;

        cors(req, res, next);

        next.called.should.be.true();
        should.not.exist(res.headers['Access-Control-Allow-Origin']);

        done();
    });
});
