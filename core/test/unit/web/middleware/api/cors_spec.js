var should = require('should'),
    sinon = require('sinon'),
    rewire = require('rewire'),
    configUtils = require('../../../../utils/configUtils'),
    cors = rewire('../../../../../server/web/middleware/api/cors'),
    sandbox = sinon.sandbox.create();

describe('cors', function () {
    var res, req, next;

    beforeEach(function () {
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
            getHeader: function () {
            },
            setHeader: function (h, v) {
                this.headers[h] = v;
            }
        };

        next = sandbox.spy();
    });

    afterEach(function () {
        sandbox.restore();
        configUtils.restore();
        cors = rewire('../../../../../server/web/middleware/api/cors');
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

    it('should be enabled if the origin matches config.url', function (done) {
        var origin = 'http://my.blog';
        configUtils.set({
            url: origin
        });

        req.get = sinon.stub().withArgs('origin').returns(origin);
        res.get = sinon.stub().withArgs('origin').returns(origin);
        req.headers.origin = origin;

        cors(req, res, next);

        next.called.should.be.true();
        res.headers['Access-Control-Allow-Origin'].should.equal(origin);

        done();
    });

    it('should be enabled if the origin matches config.url', function (done) {
        var origin = 'http://admin:2222';

        configUtils.set({
            url: 'https://blog',
            admin: {
                url: origin
            }
        });

        req.get = sinon.stub().withArgs('origin').returns(origin);
        res.get = sinon.stub().withArgs('origin').returns(origin);
        req.headers.origin = origin;

        cors(req, res, next);

        next.called.should.be.true();
        res.headers['Access-Control-Allow-Origin'].should.equal(origin);

        done();
    });
});
