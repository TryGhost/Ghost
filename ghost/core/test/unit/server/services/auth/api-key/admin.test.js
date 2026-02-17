const assert = require('node:assert/strict');
const {assertExists} = require('../../../../../utils/assertions');
const errors = require('@tryghost/errors');
const jwt = require('jsonwebtoken');
const should = require('should');
const sinon = require('sinon');
const apiKeyAuth = require('../../../../../../core/server/services/auth/api-key');
const models = require('../../../../../../core/server/models');

describe('Admin API Key Auth', function () {
    const ADMIN_API_URL_VERSIONED = '/ghost/api/v4/admin/';
    const ADMIN_API_URL_NON_VERSIONED = '/ghost/api/admin/';

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

    it('should authenticate known+valid v4 API key', function (done) {
        const token = jwt.sign({
        }, this.secret, {
            keyid: this.fakeApiKey.id,
            algorithm: 'HS256',
            expiresIn: '5m',
            audience: '/v4/admin/',
            issuer: this.fakeApiKey.id
        });

        const req = {
            originalUrl: ADMIN_API_URL_VERSIONED,
            headers: {
                authorization: `Ghost ${token}`
            }
        };
        const res = {};

        apiKeyAuth.admin.authenticate(req, res, (err) => {
            assert.equal(err, undefined);
            assert.equal(req.api_key, this.fakeApiKey);
            done();
        });
    });

    it('should authenticate known+valid non-versioned API key', function (done) {
        const token = jwt.sign({
        }, this.secret, {
            keyid: this.fakeApiKey.id,
            algorithm: 'HS256',
            expiresIn: '5m',
            audience: '/admin/',
            issuer: this.fakeApiKey.id
        });

        const req = {
            originalUrl: `${ADMIN_API_URL_NON_VERSIONED}session/`,
            headers: {
                authorization: `Ghost ${token}`
            }
        };
        const res = {};

        apiKeyAuth.admin.authenticate(req, res, (err) => {
            assert.equal(err, undefined);
            assert.equal(req.api_key, this.fakeApiKey);
            done();
        });
    });

    it('should authenticate known+valid non-versioned API key with a token created for versioned API', function (done) {
        const token = jwt.sign({
        }, this.secret, {
            keyid: this.fakeApiKey.id,
            algorithm: 'HS256',
            expiresIn: '5m',
            audience: 'v4/admin/',
            issuer: this.fakeApiKey.id
        });

        const req = {
            originalUrl: `${ADMIN_API_URL_NON_VERSIONED}session/`,
            headers: {
                authorization: `Ghost ${token}`
            }
        };
        const res = {};

        apiKeyAuth.admin.authenticate(req, res, (err) => {
            assert.equal(err, undefined);
            assert.equal(req.api_key, this.fakeApiKey);
            done();
        });
    });

    it('should NOT authenticate known+valid versioned API key with a token created for non-versioned API', function (done) {
        const token = jwt.sign({
        }, this.secret, {
            keyid: this.fakeApiKey.id,
            algorithm: 'HS256',
            expiresIn: '5m',
            audience: 'admin/',
            issuer: this.fakeApiKey.id
        });

        const req = {
            originalUrl: `${ADMIN_API_URL_VERSIONED}session/`,
            headers: {
                authorization: `Ghost ${token}`
            }
        };
        const res = {};

        apiKeyAuth.admin.authenticate(req, res, (err) => {
            assertExists(err);
            assert.equal(err instanceof errors.UnauthorizedError, true);
            assert.equal(err.code, 'INVALID_JWT');
            assert.equal(req.api_key, undefined);
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
            assertExists(err);
            assert.equal(err instanceof errors.UnauthorizedError, true);
            assert.equal(err.code, 'INVALID_AUTH_HEADER');
            assert.equal(req.api_key, undefined);
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
            assertExists(err);
            assert.equal(err instanceof errors.BadRequestError, true);
            assert.equal(err.code, 'INVALID_JWT');
            assert.equal(req.api_key, undefined);
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
            originalUrl: ADMIN_API_URL_VERSIONED,
            headers: {
                authorization: `Ghost ${token}`
            }
        };
        const res = {};

        apiKeyAuth.admin.authenticate(req, res, function next(err) {
            assertExists(err);
            assert.equal(err instanceof errors.UnauthorizedError, true);
            assert.equal(err.code, 'UNKNOWN_ADMIN_API_KEY');
            assert.equal(req.api_key, undefined);
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
            audience: '/v4/admin/',
            issuer: this.fakeApiKey.id
        });

        const req = {
            originalUrl: ADMIN_API_URL_VERSIONED,
            headers: {
                authorization: `Ghost ${token}`
            }
        };
        const res = {};

        apiKeyAuth.admin.authenticate(req, res, function next(err) {
            assertExists(err);
            assert.equal(err instanceof errors.UnauthorizedError, true);
            assert.equal(err.code, 'INVALID_JWT');
            assert.match(err.message, /jwt expired/);
            assert.equal(req.api_key, undefined);
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
            audience: '/v4/admin/',
            issuer: this.fakeApiKey.id
        });

        const req = {
            originalUrl: ADMIN_API_URL_VERSIONED,
            headers: {
                authorization: `Ghost ${token}`
            }
        };
        const res = {};

        apiKeyAuth.admin.authenticate(req, res, function next(err) {
            assertExists(err);
            assert.equal(err instanceof errors.UnauthorizedError, true);
            assert.equal(err.code, 'INVALID_JWT');
            assert.match(err.message, /maxAge exceeded/);
            assert.equal(req.api_key, undefined);
            done();
        });
    });

    it('shouldn\'t authenticate with a Content API Key', function (done) {
        const token = jwt.sign({
        }, this.secret, {
            keyid: this.fakeApiKey.id,
            algorithm: 'HS256',
            expiresIn: '5m',
            audience: 'v4/admin/',
            issuer: this.fakeApiKey.id
        });

        const req = {
            originalUrl: ADMIN_API_URL_VERSIONED,
            headers: {
                authorization: `Ghost ${token}`
            }
        };
        const res = {};

        this.fakeApiKey.type = 'content';

        apiKeyAuth.admin.authenticate(req, res, function next(err) {
            assertExists(err);
            assert.equal(err instanceof errors.UnauthorizedError, true);
            assert.equal(err.code, 'INVALID_API_KEY_TYPE');
            assert.equal(req.api_key, undefined);
            done();
        });
    });
});
