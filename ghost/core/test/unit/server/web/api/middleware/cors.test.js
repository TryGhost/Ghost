const should = require('should');
const sinon = require('sinon');
const rewire = require('rewire');
const configUtils = require('../../../../../utils/configUtils');

let cors = rewire('../../../../../../core/server/web/api/middleware/cors')[1];
let corsCaching = rewire('../../../../../../core/server/web/api/middleware/cors')[0];

describe('cors', function () {
    let res;
    let req;
    let next;

    beforeEach(function () {
        req = {
            method: 'OPTIONS',
            headers: {
                origin: null
            },
            client: {}
        };

        res = {
            headers: {},
            getHeader: function () {
            },
            vary: sinon.spy(),
            setHeader: function (h, v) {
                this.headers[h] = v;
            },
            end: sinon.spy()
        };

        next = sinon.spy();
    });

    afterEach(async function () {
        sinon.restore();
        await configUtils.restore();
        cors = rewire('../../../../../../core/server/web/api/middleware/cors')[1];
    });

    it('should not be enabled without a request origin header', function (done) {
        req.get = sinon.stub().withArgs('origin').returns(null);

        cors(req, res, next);

        next.called.should.be.true();
        should.not.exist(res.headers['Access-Control-Allow-Origin']);

        done();
    });

    it('should be enabled when origin is 127.0.0.1', function (done) {
        const origin = 'http://127.0.0.1:2368';

        req.get = sinon.stub().withArgs('origin').returns(origin);
        res.get = sinon.stub().withArgs('origin').returns(origin);
        req.headers.origin = origin;

        cors(req, res, next);

        res.end.called.should.be.true();
        res.headers['Access-Control-Allow-Origin'].should.equal(origin);

        done();
    });

    it('should be enabled when origin is localhost', function (done) {
        const origin = 'http://localhost:2368';

        req.get = sinon.stub().withArgs('origin').returns(origin);
        res.get = sinon.stub().withArgs('origin').returns(origin);
        req.headers.origin = origin;

        cors(req, res, next);

        res.end.called.should.be.true();
        res.headers['Access-Control-Allow-Origin'].should.equal(origin);

        done();
    });

    it('should not be enabled the if origin is not allowed', function (done) {
        const origin = 'http://not-trusted.com';

        req.get = sinon.stub().withArgs('origin').returns(origin);
        res.get = sinon.stub().withArgs('origin').returns(origin);
        req.headers.origin = origin;

        cors(req, res, next);

        next.called.should.be.true();
        should.not.exist(res.headers['Access-Control-Allow-Origin']);

        done();
    });

    it('should be enabled if the origin matches config.url', function (done) {
        const origin = 'http://my.blog';

        configUtils.set({url: origin});

        req.get = sinon.stub().withArgs('origin').returns(origin);
        res.get = sinon.stub().withArgs('origin').returns(origin);
        req.headers.origin = origin;

        cors(req, res, next);

        res.end.called.should.be.true();
        res.headers['Access-Control-Allow-Origin'].should.equal(origin);

        done();
    });

    it('should be enabled if the origin matches config.url', function (done) {
        const origin = 'http://admin:2222';

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

        res.end.called.should.be.true();
        res.headers['Access-Control-Allow-Origin'].should.equal(origin);

        done();
    });

    it('should add origin value to the vary header', function (done) {
        corsCaching(req, res, function () {
            should.equal(res.vary.called, true);
            should.equal(res.vary.args[0], 'Origin');
            done();
        });
    });

    it('should NOT add origin value to the vary header when not an OPTIONS request', function (done) {
        req.method = 'GET';
        corsCaching(req, res, function () {
            should.equal(res.vary.called, false);
            done();
        });
    });
});
