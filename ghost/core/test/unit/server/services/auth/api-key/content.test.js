const assert = require('node:assert/strict');
const {assertExists} = require('../../../../../utils/assertions');
const errors = require('@tryghost/errors');
const {authenticateContentApiKey} = require('../../../../../../core/server/services/auth/api-key/content');
const models = require('../../../../../../core/server/models');
const sinon = require('sinon');

describe('Content API Key Auth', function () {
    let fakeApiKey;

    beforeAll(function () {
        models.init();
    });

    beforeEach(function () {
        fakeApiKey = {
            id: '1234',
            type: 'content',
            secret: Buffer.from('testing').toString('hex'),
            get(prop) {
                return this[prop];
            }
        };

        const apiKeyStub = sinon.stub(models.ApiKey, 'findOne');
        apiKeyStub.returns(Promise.resolve());
        apiKeyStub.withArgs({secret: fakeApiKey.secret}).returns(Promise.resolve(fakeApiKey));
    });

    afterEach(function () {
        sinon.restore();
    });

    it('should authenticate with known+valid key', async function () {
        await new Promise((resolve, reject) => {
            const done = err => (err ? reject(err) : resolve());
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
        });
    });

    it('shouldn\'t authenticate with invalid/unknown key', async function () {
        await new Promise((resolve, reject) => {
            const done = err => (err ? reject(err) : resolve());
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
    });

    it('shouldn\'t authenticate with a non-content-api key', async function () {
        await new Promise((resolve, reject) => {
            const done = err => (err ? reject(err) : resolve());
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
        });
    });

    it('shouldn\'t authenticate with invalid request', async function () {
        await new Promise((resolve, reject) => {
            const done = err => (err ? reject(err) : resolve());
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
        });
    });
});
