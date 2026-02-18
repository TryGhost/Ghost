const assert = require('node:assert/strict');
const {assertExists} = require('../../../../../utils/assertions');
const errors = require('@tryghost/errors');
const {authenticateContentApiKey} = require('../../../../../../core/server/services/auth/api-key/content');
const models = require('../../../../../../core/server/models');
const sinon = require('sinon');

describe('Content API Key Auth', function () {
    before(models.init);

    this.beforeEach(function () {
        const fakeApiKey = {
            id: '1234',
            type: 'content',
            secret: Buffer.from('testing').toString('hex'),
            get(prop) {
                return this[prop];
            }
        };
        this.fakeApiKey = fakeApiKey;

        this.apiKeyStub = sinon.stub(models.ApiKey, 'findOne');
        this.apiKeyStub.returns(Promise.resolve());
        this.apiKeyStub.withArgs({secret: fakeApiKey.secret}).returns(Promise.resolve(fakeApiKey));
    });

    afterEach(function () {
        sinon.restore();
    });

    it('should authenticate with known+valid key', function (done) {
        const req = {
            query: {
                key: this.fakeApiKey.secret
            }
        };
        const res = {};

        authenticateContentApiKey(req, res, (arg) => {
            assert.equal(arg, undefined);
            assert.equal(req.api_key, this.fakeApiKey);
            done();
        });
    });

    it('shouldn\'t authenticate with invalid/unknown key', function (done) {
        const req = {
            query: {
                key: 'unknown'
            }
        };
        const res = {};

        authenticateContentApiKey(req, res, function next(err) {
            assertExists(err);
            assert.equal(err instanceof errors.UnauthorizedError, true);
            assert.equal(err.code, 'UNKNOWN_CONTENT_API_KEY');
            assert.equal(req.api_key, undefined);
            done();
        });
    });

    it('shouldn\'t authenticate with a non-content-api key', function (done) {
        const req = {
            query: {
                key: this.fakeApiKey.secret
            }
        };
        const res = {};

        this.fakeApiKey.type = 'admin';

        authenticateContentApiKey(req, res, function next(err) {
            assertExists(err);
            assert.equal(err instanceof errors.UnauthorizedError, true);
            assert.equal(err.code, 'INVALID_API_KEY_TYPE');
            assert.equal(req.api_key, undefined);
            done();
        });
    });

    it('shouldn\'t authenticate with invalid request', function (done) {
        const req = {
            query: {
                key: [this.fakeApiKey.secret, '']
            }
        };
        const res = {};

        authenticateContentApiKey(req, res, function next(err) {
            assertExists(err);
            assert.equal(err instanceof errors.BadRequestError, true);
            assert.equal(err.code, 'INVALID_REQUEST');
            assert.equal(req.api_key, undefined);
            done();
        });
    });
});
