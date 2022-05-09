const assert = require('assert');
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
            assert.equal(APIVersionCompatibilityService.handleMismatch.args[0][0].acceptVersion, 'v3.28');
            assert.equal(APIVersionCompatibilityService.handleMismatch.args[0][0].contentVersion, 'v4.46');
            assert.equal(APIVersionCompatibilityService.handleMismatch.args[0][0].requestURL, '/api/admin/posts/1');
            assert.equal(APIVersionCompatibilityService.handleMismatch.args[0][0].userAgent, 'Zapier/2.1 GhostAdminSDK/3.28');

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
