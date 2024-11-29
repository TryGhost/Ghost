const assert = require('assert/strict');
const sinon = require('sinon');

const hcaptchaMiddleware = require('../lib/hcaptcha-middleware');
const hcaptcha = require('hcaptcha');

describe('hcaptcha-middleware', function () {
    beforeEach(function () {
        sinon.stub(hcaptcha, 'verify');
    });

    afterEach(function () {
        hcaptcha.verify.restore();
    });

    it('calls next if hcaptcha.verify returns success', function (done) {
        hcaptcha.verify.resolves({success: true});

        const req = {
            body: {
                token: 'token'
            }
        };
        const res = {};
        const next = sinon.spy();

        hcaptchaMiddleware('test-secret')(req, res, next);

        setTimeout(function () {
            assert.equal(next.callCount, 1, 'next should be called once');
            assert.equal(next.firstCall.args.length, 0, 'next should be called without errors');
            done();
        }, 0);
    });

    it('returns a BadRequestError if no token passed', function (done) {
        const req = {
            body: {}
        };
        const res = {};
        const next = sinon.spy();

        hcaptchaMiddleware('test-secret')(req, res, next);

        setTimeout(function () {
            assert.equal(next.callCount, 1, 'next should be called once');
            assert.equal(next.firstCall.args.length, 1, 'next should be called with an error');
            assert.equal(next.firstCall.args[0].errorType, 'BadRequestError', 'error should be BadRequestError');
            done();
        }, 0);
    });

    it('returns an internal server error if hcaptcha throws', function (done) {
        hcaptcha.verify.rejects(new Error('test error'));

        const req = {
            body: {
                token: 'token'
            }
        };
        const res = {};
        const next = sinon.spy();

        hcaptchaMiddleware('test-secret')(req, res, next);

        setTimeout(function () {
            assert.equal(next.callCount, 1, 'next should be called once');
            assert.equal(next.firstCall.args.length, 1, 'next should be called with an error');
            assert.equal(next.firstCall.args[0].errorType, 'InternalServerError', 'error should be InternalServerError');
            done();
        }, 0);
    });
});
