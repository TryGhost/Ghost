const assert = require('assert/strict');
const sinon = require('sinon');
const CaptchaService = require('../index');
const hcaptcha = require('hcaptcha');

describe('CaptchaService', function () {
    beforeEach(function () {
        sinon.stub(hcaptcha, 'verify');
    });

    afterEach(function () {
        hcaptcha.verify.restore();
    });

    it('Creates a middleware when enabled', function () {
        const captchaService = new CaptchaService({
            enabled: true,
            secretKey: 'test-secret'
        });

        const captchaMiddleware = captchaService.getMiddleware();
        assert.equal(captchaMiddleware.length, 3);
    });

    it('No-ops if CAPTCHA score is safe', function (done) {
        hcaptcha.verify.resolves({score: 0.6});

        const captchaService = new CaptchaService({
            enabled: true,
            scoreThreshold: 0.8,
            secretKey: 'test-secret'
        });

        const captchaMiddleware = captchaService.getMiddleware();

        const req = {
            body: {
                token: 'test-token'
            }
        };

        captchaMiddleware(req, null, (err) => {
            assert.equal(err, undefined);
            done();
        });
    });

    it('Errors when CAPTCHA score is suspicious', function (done) {
        hcaptcha.verify.resolves({score: 0.8});

        const captchaService = new CaptchaService({
            enabled: true,
            scoreThreshold: 0.8,
            secretKey: 'test-secret'
        });

        const captchaMiddleware = captchaService.getMiddleware();

        const req = {
            body: {
                token: 'test-token'
            }
        };

        captchaMiddleware(req, null, (err) => {
            assert.equal(err.message, 'The server has encountered an error.');
            done();
        });
    });

    it('Fails gracefully if hcaptcha verification fails', function (done) {
        hcaptcha.verify.rejects(new Error('Test error'));

        const captchaService = new CaptchaService({
            enabled: true,
            scoreThreshold: 0.8,
            secretKey: 'test-secret'
        });

        const captchaMiddleware = captchaService.getMiddleware();

        const req = {
            body: {
                token: 'test-token'
            }
        };

        captchaMiddleware(req, null, (err) => {
            assert.equal(err.message, 'Failed to verify hCaptcha token');
            done();
        });
    });

    it('Returns a 400 if no token provided', function (done) {
        const captchaService = new CaptchaService({
            enabled: true,
            scoreThreshold: 0.8,
            secret: 'test-secret'
        });

        const captchaMiddleware = captchaService.getMiddleware();

        const req = {
            body: {}
        };

        captchaMiddleware(req, null, (err) => {
            assert.equal(err.message, 'hCaptcha token missing');
            done();
        });
    });

    it('Returns no-op middleware when not enabled', function (done) {
        const captchaService = new CaptchaService({
            enabled: false,
            secretKey: 'test-secret'
        });

        const captchaMiddleware = captchaService.getMiddleware();
        captchaMiddleware(null, null, () => {
            done();
        });
    });
});
