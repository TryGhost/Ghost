const assert = require('assert/strict');
const CaptchaService = require('../index');

describe('CaptchaService', function () {
    it('Returns whether the service is enabled', function () {
        const captchaService = new CaptchaService({
            enabled: true,
            secretKey: 'test-secret'
        });

        assert.equal(captchaService.isEnabled(), true);

        const disabledCaptchaService = new CaptchaService({
            enabled: false,
            secretKey: 'test-secret'
        });

        assert.equal(disabledCaptchaService.isEnabled(), false);
    });

    it('Creates a middleware when enabled', function () {
        const captchaService = new CaptchaService({
            enabled: true,
            secretKey: 'test-secret'
        });

        const tokenMiddleware = captchaService.getTokenMiddleware();
        assert.equal(tokenMiddleware.length, 3);
    });

    it('No-ops if CAPTCHA score is safe', function (done) {
        const captchaService = new CaptchaService({
            enabled: true,
            scoreThreshold: 0.8,
            secretKey: 'test-secret'
        });

        const evaluationMiddleware = captchaService.getEvaluationMiddleware();

        const req = {
            hcaptcha: {
                score: 0.6
            }
        };

        evaluationMiddleware(req, null, (err) => {
            assert.equal(err, undefined);
            done();
        });
    });

    it('Errors when CAPTCHA score is suspicious', function (done) {
        const captchaService = new CaptchaService({
            enabled: true,
            scoreThreshold: 0.8,
            secretKey: 'test-secret'
        });

        const evaluationMiddleware = captchaService.getEvaluationMiddleware();

        const req = {
            hcaptcha: {
                score: 0.8
            }
        };

        evaluationMiddleware(req, null, (err) => {
            assert.equal(err.message, 'The server has encountered an error.');
            done();
        });
    });

    it('Returns no-op token middleware when not enabled', function (done) {
        const captchaService = new CaptchaService({
            enabled: false,
            secretKey: 'test-secret'
        });

        const tokenMiddleware = captchaService.getTokenMiddleware();
        tokenMiddleware(null, null, () => {
            done();
        });
    });

    it('Returns no-op evaluation middleware when not enabled', function (done) {
        const captchaService = new CaptchaService({
            enabled: false,
            secretKey: 'test-secret'
        });

        const evaluationMiddlware = captchaService.getEvaluationMiddleware();
        evaluationMiddlware(null, null, () => {
            done();
        });
    });
});
