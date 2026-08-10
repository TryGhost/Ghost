const assert = require('node:assert/strict');
const {deferred} = require('../../../../../utils/deferred')
const {assertExists} = require('../../../../../utils/assertions');
const errors = require('@tryghost/errors');
const {authenticateContentApiKey} = require('../../../../../../core/server/services/auth/api-key/content');
const {ApiKey} = require('../../../../../../core/server/models/api-key');
const sinon = require('sinon');

describe('Content API Key Auth', function () {
    let fakeApiKey;
    let apiKeyStub;

    beforeEach(function () {
        fakeApiKey = {
            id: '1234',
            type: 'content',
            secret: Buffer.from('testing').toString('hex'),
            get(prop) {
                return this[prop];
            }
        };

        apiKeyStub = sinon.stub(ApiKey, 'findOne');
        apiKeyStub.returns(Promise.resolve());
        apiKeyStub.withArgs({secret: fakeApiKey.secret}).returns(Promise.resolve(fakeApiKey));
    });

    afterEach(function () {
        sinon.restore();
    });

    it('should authenticate with known+valid key', function () {
        const {promise, done} = deferred();
        const req = {
            query: {
                key: fakeApiKey.secret
            }
        };
        const res = {};

        authenticateContentApiKey(req, res, (arg) => {
            assert.equal(arg, undefined);
            assert.equal(req.api_key, fakeApiKey);
            done();
        });
        return promise;
    });

    it('shouldn\'t authenticate with invalid/unknown key', function () {
        const {promise, done} = deferred();
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
        return promise;
    });

    it('shouldn\'t authenticate with a non-content-api key', function () {
        const {promise, done} = deferred();
        const req = {
            query: {
                key: fakeApiKey.secret
            }
        };
        const res = {};

        fakeApiKey.type = 'admin';

        authenticateContentApiKey(req, res, function next(err) {
            assertExists(err);
            assert.equal(err instanceof errors.UnauthorizedError, true);
            assert.equal(err.code, 'INVALID_API_KEY_TYPE');
            assert.equal(req.api_key, undefined);
            done();
        });
        return promise;
    });

    it('shouldn\'t authenticate with invalid request', function () {
        const {promise, done} = deferred();
        const req = {
            query: {
                key: [fakeApiKey.secret, '']
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
        return promise;
    });
});
