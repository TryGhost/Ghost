const {authenticateAdminApiKey} = require('../../../../../server/services/auth/api-key/admin');
const common = require('../../../../../server/lib/common');
const jwt = require('jsonwebtoken');
const models = require('../../../../../server/models');
const should = require('should');
const sinon = require('sinon');
const testUtils = require('../../../../utils');

const sandbox = sinon.sandbox.create();

describe('Admin API Key Auth', function () {
    before(models.init);
    before(testUtils.teardown);

    beforeEach(function () {
        const fakeApiKey = {
            id: '1234',
            type: 'admin',
            secret: Buffer.from('testing').toString('hex'),
            get(prop) {
                return this[prop];
            }
        };
        this.fakeApiKey = fakeApiKey;
        this.secret = Buffer.from(fakeApiKey.secret, 'hex');

        this.apiKeyStub = sandbox.stub(models.ApiKey, 'findOne');
        this.apiKeyStub.returns(new Promise.resolve());
        this.apiKeyStub.withArgs({id: fakeApiKey.id}).returns(new Promise.resolve(fakeApiKey));
    });

    afterEach(function () {
        sandbox.restore();
    });

    it('should authenticate known+valid API key', function (done) {
        const token = jwt.sign({}, this.secret, {
            algorithm: 'HS256',
            expiresIn: '5m',
            audience: '/test/',
            issuer: this.fakeApiKey.id,
            keyid: this.fakeApiKey.id
        });

        const req = {
            originalUrl: '/test/',
            headers: {
                authorization: `Ghost ${token}`
            }
        };
        const res = {};

        authenticateAdminApiKey(req, res, (arg) => {
            should.not.exist(arg);
            req.api_key.should.eql(this.fakeApiKey);
            done();
        });
    });

    it('shouldn\'t authenticate with missing Ghost token', function (done) {
        const token = '';
        const req = {
            headers: {
                authorization: `Ghost ${token}`
            }
        };
        const res = {};

        authenticateAdminApiKey(req, res, function next(err) {
            should.exist(err);
            should.equal(err instanceof common.errors.UnauthorizedError, true);
            err.code.should.eql('INVALID_AUTH_HEADER');
            should.not.exist(req.api_key);
            done();
        });
    });

    it('shouldn\'t authenticate with broken Ghost token', function (done) {
        const token = 'invalid';
        const req = {
            headers: {
                authorization: `Ghost ${token}`
            }
        };
        const res = {};

        authenticateAdminApiKey(req, res, function next(err) {
            should.exist(err);
            should.equal(err instanceof common.errors.BadRequestError, true);
            err.code.should.eql('INVALID_JWT');
            should.not.exist(req.api_key);
            done();
        });
    });

    it('shouldn\'t authenticate with invalid/unknown key', function (done) {
        const token = jwt.sign({}, this.secret, {
            algorithm: 'HS256',
            expiresIn: '5m',
            audience: '/test/',
            issuer: 'unknown',
            keyid: 'unknown'
        });

        const req = {
            originalUrl: '/test/',
            headers: {
                authorization: `Ghost ${token}`
            }
        };
        const res = {};

        authenticateAdminApiKey(req, res, function next(err) {
            should.exist(err);
            should.equal(err instanceof common.errors.UnauthorizedError, true);
            err.code.should.eql('UNKNOWN_ADMIN_API_KEY');
            should.not.exist(req.api_key);
            done();
        });
    });

    it('shouldn\'t authenticate with JWT signed > 5min ago', function (done) {
        const payload = {
            iat: Math.floor(Date.now() / 1000) - 6 * 60
        };
        const token = jwt.sign(payload, this.secret, {
            algorithm: 'HS256',
            expiresIn: '5m',
            audience: '/test/',
            issuer: this.fakeApiKey.id,
            keyid: this.fakeApiKey.id
        });

        const req = {
            originalUrl: '/test/',
            headers: {
                authorization: `Ghost ${token}`
            }
        };
        const res = {};

        authenticateAdminApiKey(req, res, function next(err) {
            should.exist(err);
            should.equal(err instanceof common.errors.UnauthorizedError, true);
            err.code.should.eql('INVALID_JWT');
            err.message.should.match(/jwt expired/);
            should.not.exist(req.api_key);
            done();
        });
    });

    it('shouldn\'t authenticate with JWT with maxAge > 5min', function (done) {
        const payload = {
            iat: Math.floor(Date.now() / 1000) - 6 * 60
        };
        const token = jwt.sign(payload, this.secret, {
            algorithm: 'HS256',
            expiresIn: '10m',
            audience: '/test/',
            issuer: this.fakeApiKey.id,
            keyid: this.fakeApiKey.id
        });

        const req = {
            originalUrl: '/test/',
            headers: {
                authorization: `Ghost ${token}`
            }
        };
        const res = {};

        authenticateAdminApiKey(req, res, function next(err) {
            should.exist(err);
            should.equal(err instanceof common.errors.UnauthorizedError, true);
            err.code.should.eql('INVALID_JWT');
            err.message.should.match(/maxAge exceeded/);
            should.not.exist(req.api_key);
            done();
        });
    });

    it('shouldn\'t authenticate with a Content API Key', function (done) {
        const token = jwt.sign({}, this.secret, {
            algorithm: 'HS256',
            expiresIn: '5m',
            audience: '/test/',
            issuer: this.fakeApiKey.id,
            keyid: this.fakeApiKey.id
        });

        const req = {
            originalUrl: '/test/',
            headers: {
                authorization: `Ghost ${token}`
            }
        };
        const res = {};

        this.fakeApiKey.type = 'content';

        authenticateAdminApiKey(req, res, function next(err) {
            should.exist(err);
            should.equal(err instanceof common.errors.UnauthorizedError, true);
            err.code.should.eql('INVALID_API_KEY_TYPE');
            should.not.exist(req.api_key);
            done();
        });
    });
});
