const jwt = require('jsonwebtoken');
const should = require('should');
const sinon = require('sinon');
const Promise = require('bluebird');
const apiKeyAuth = require('../../../../../core/server/services/auth/api-key');
const common = require('../../../../../core/server/lib/common');
const models = require('../../../../../core/server/models');
const testUtils = require('../../../../utils');

describe('Admin API Key Auth', function () {
    before(models.init);

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

        this.apiKeyStub = sinon.stub(models.ApiKey, 'findOne');
        this.apiKeyStub.resolves();
        this.apiKeyStub.withArgs({id: fakeApiKey.id}).resolves(fakeApiKey);
    });

    afterEach(function () {
        sinon.restore();
    });

    it('should authenticate known+valid v2 API key', function (done) {
        const token = jwt.sign({
        }, this.secret, {
            keyid: this.fakeApiKey.id,
            algorithm: 'HS256',
            expiresIn: '5m',
            audience: '/v2/admin/',
            issuer: this.fakeApiKey.id
        });

        const req = {
            originalUrl: '/ghost/api/v2/admin/',
            headers: {
                authorization: `Ghost ${token}`
            }
        };
        const res = {};

        apiKeyAuth.admin.authenticate(req, res, (err) => {
            should.not.exist(err);
            req.api_key.should.eql(this.fakeApiKey);
            done();
        });
    });

    it('should authenticate known+valid canary API key', function (done) {
        const token = jwt.sign({
        }, this.secret, {
            keyid: this.fakeApiKey.id,
            algorithm: 'HS256',
            expiresIn: '5m',
            audience: '/canary/admin/',
            issuer: this.fakeApiKey.id
        });

        const req = {
            originalUrl: '/ghost/api/canary/admin/',
            headers: {
                authorization: `Ghost ${token}`
            }
        };
        const res = {};

        apiKeyAuth.admin.authenticate(req, res, (err) => {
            should.not.exist(err);
            req.api_key.should.eql(this.fakeApiKey);
            done();
        });
    });

    it('should authenticate known+valid v3 API key', function (done) {
        const token = jwt.sign({
        }, this.secret, {
            keyid: this.fakeApiKey.id,
            algorithm: 'HS256',
            expiresIn: '5m',
            audience: '/v3/admin/',
            issuer: this.fakeApiKey.id
        });

        const req = {
            originalUrl: '/ghost/api/v3/admin/',
            headers: {
                authorization: `Ghost ${token}`
            }
        };
        const res = {};

        apiKeyAuth.admin.authenticate(req, res, (err) => {
            should.not.exist(err);
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

        apiKeyAuth.admin.authenticate(req, res, function next(err) {
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

        apiKeyAuth.admin.authenticate(req, res, function next(err) {
            should.exist(err);
            should.equal(err instanceof common.errors.BadRequestError, true);
            err.code.should.eql('INVALID_JWT');
            should.not.exist(req.api_key);
            done();
        });
    });

    it('shouldn\'t authenticate with invalid/unknown key', function (done) {
        const token = jwt.sign({
        }, this.secret, {
            keyid: 'unknown',
            algorithm: 'HS256',
            expiresIn: '5m',
            audience: 'wrong audience',
            issuer: 'unknown'
        });

        const req = {
            originalUrl: '/ghost/api/v2/admin/',
            headers: {
                authorization: `Ghost ${token}`
            }
        };
        const res = {};

        apiKeyAuth.admin.authenticate(req, res, function next(err) {
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
            keyid: this.fakeApiKey.id,
            algorithm: 'HS256',
            expiresIn: '5m',
            audience: '/v2/admin/',
            issuer: this.fakeApiKey.id
        });

        const req = {
            originalUrl: '/ghost/api/v2/admin/',
            headers: {
                authorization: `Ghost ${token}`
            }
        };
        const res = {};

        apiKeyAuth.admin.authenticate(req, res, function next(err) {
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
            keyid: this.fakeApiKey.id,
            algorithm: 'HS256',
            expiresIn: '10m',
            audience: '/v2/admin/',
            issuer: this.fakeApiKey.id
        });

        const req = {
            originalUrl: '/ghost/api/v2/admin/',
            headers: {
                authorization: `Ghost ${token}`
            }
        };
        const res = {};

        apiKeyAuth.admin.authenticate(req, res, function next(err) {
            should.exist(err);
            should.equal(err instanceof common.errors.UnauthorizedError, true);
            err.code.should.eql('INVALID_JWT');
            err.message.should.match(/maxAge exceeded/);
            should.not.exist(req.api_key);
            done();
        });
    });

    it('shouldn\'t authenticate with a Content API Key', function (done) {
        const token = jwt.sign({
        }, this.secret, {
            keyid: this.fakeApiKey.id,
            algorithm: 'HS256',
            expiresIn: '5m',
            audience: '/v2/admin/',
            issuer: this.fakeApiKey.id
        });

        const req = {
            originalUrl: '/ghost/api/v2/admin/',
            headers: {
                authorization: `Ghost ${token}`
            }
        };
        const res = {};

        this.fakeApiKey.type = 'content';

        apiKeyAuth.admin.authenticate(req, res, function next(err) {
            should.exist(err);
            should.equal(err instanceof common.errors.UnauthorizedError, true);
            err.code.should.eql('INVALID_API_KEY_TYPE');
            should.not.exist(req.api_key);
            done();
        });
    });
});
