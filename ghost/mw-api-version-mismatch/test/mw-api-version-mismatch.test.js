const assert = require('assert/strict');
const sinon = require('sinon');
const errors = require('@tryghost/errors');

const versionMismatchMW = require('../index');

describe('mw-api-version-mismatch', function () {
    it('Does call handle mismatch when a generic RequestNotAcceptableError is used', function (done) {
        const APIVersionCompatibilityService = {
            handleMismatch: sinon.stub().resolves()
        };
        const req = {
            originalUrl: '/api/admin/posts/1',
            headers: {
                'accept-version': 'v3.28',
                'user-agent': 'Zapier/2.1 GhostAdminSDK/3.28'
            }
        };
        const res = {
            locals: {
                safeVersion: '4.46'
            }
        };

        versionMismatchMW(APIVersionCompatibilityService)(new errors.RequestNotAcceptableError({
            code: 'UPDATE_CLIENT'
        }), req, res, () => {
            assert.equal(APIVersionCompatibilityService.handleMismatch.called, true);
            assert.deepEqual(Object.keys(APIVersionCompatibilityService.handleMismatch.args[0][0]), [
                'acceptVersion',
                'contentVersion',
                'requestURL',
                'userAgent',
                'apiKeyValue',
                'apiKeyType'
            ], 'handleMismatch called with wrong arguments');

            assert.equal(APIVersionCompatibilityService.handleMismatch.args[0][0].acceptVersion, 'v3.28');
            assert.equal(APIVersionCompatibilityService.handleMismatch.args[0][0].contentVersion, 'v4.46');
            assert.equal(APIVersionCompatibilityService.handleMismatch.args[0][0].requestURL, '/api/admin/posts/1');
            assert.equal(APIVersionCompatibilityService.handleMismatch.args[0][0].userAgent, 'Zapier/2.1 GhostAdminSDK/3.28');
            assert.equal(APIVersionCompatibilityService.handleMismatch.args[0][0].apiKeyValue, null);
            assert.equal(APIVersionCompatibilityService.handleMismatch.args[0][0].apiKeyType, null);

            done();
        });
    });

    it('Does call handle mismatch when with correct API key values when identification information is in the request', function (done) {
        const APIVersionCompatibilityService = {
            handleMismatch: sinon.stub().resolves()
        };
        const req = {
            originalUrl: '/api/admin/posts/1?tim_me=please',
            query: {
                key: 'content_api_key_secret'
            },
            headers: {
                'accept-version': 'v3.28',
                'user-agent': 'Zapier/2.1 GhostAdminSDK/3.28'
            }
        };
        const res = {
            locals: {
                safeVersion: '4.46'
            }
        };

        versionMismatchMW(APIVersionCompatibilityService)(new errors.RequestNotAcceptableError({
            code: 'UPDATE_CLIENT'
        }), req, res, () => {
            assert.equal(APIVersionCompatibilityService.handleMismatch.called, true);
            assert.deepEqual(Object.keys(APIVersionCompatibilityService.handleMismatch.args[0][0]), [
                'acceptVersion',
                'contentVersion',
                'requestURL',
                'userAgent',
                'apiKeyValue',
                'apiKeyType'
            ], 'handleMismatch called with wrong arguments');

            assert.equal(APIVersionCompatibilityService.handleMismatch.args[0][0].acceptVersion, 'v3.28');
            assert.equal(APIVersionCompatibilityService.handleMismatch.args[0][0].contentVersion, 'v4.46');
            assert.equal(APIVersionCompatibilityService.handleMismatch.args[0][0].requestURL, '/api/admin/posts/1', 'trims query string');
            assert.equal(APIVersionCompatibilityService.handleMismatch.args[0][0].userAgent, 'Zapier/2.1 GhostAdminSDK/3.28');
            assert.equal(APIVersionCompatibilityService.handleMismatch.args[0][0].apiKeyValue, 'content_api_key_secret');
            assert.equal(APIVersionCompatibilityService.handleMismatch.args[0][0].apiKeyType, 'content');

            done();
        });
    });

    it('Does NOT call handle mismatch when a generic RequestNotAcceptableError is used', function (done) {
        const APIVersionCompatibilityService = {
            handleMismatch: sinon.stub().resolves()
        };

        versionMismatchMW(APIVersionCompatibilityService)(new errors.RequestNotAcceptableError(), {}, {}, () => {
            assert.equal(APIVersionCompatibilityService.handleMismatch.called, false);
            done();
        });
    });
});
