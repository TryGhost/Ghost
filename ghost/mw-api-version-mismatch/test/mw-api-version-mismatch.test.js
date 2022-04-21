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
            headers: {}
        };
        const res = {
            locals: {}
        };

        versionMismatchMW(APIVersionCompatibilityService)(new errors.RequestNotAcceptableError({
            code: 'UPDATE_CLIENT'
        }), req, res, () => {
            assert.equal(APIVersionCompatibilityService.handleMismatch.called, true);
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
