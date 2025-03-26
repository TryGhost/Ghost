const hcaptcha = require('hcaptcha');
const logging = require('@tryghost/logging');
const {InternalServerError, BadRequestError, utils: errorUtils} = require('@tryghost/errors');

class CaptchaService {
    #enabled;
    #scoreThreshold;
    #secretKey;

    /**
     * @param {Object} options
     * @param {boolean} [options.enabled] Whether hCaptcha is enabled
     * @param {number} [options.scoreThreshold] Score threshold for bot detection
     * @param {string} [options.secretKey] hCaptcha secret key
     */
    constructor({
        enabled,
        scoreThreshold,
        secretKey
    }) {
        this.#enabled = enabled;
        this.#secretKey = secretKey;
        this.#scoreThreshold = scoreThreshold;
    }

    getMiddleware() {
        const scoreThreshold = this.#scoreThreshold;
        const secretKey = this.#secretKey;

        if (!this.#enabled) {
            return function captchaNoOpMiddleware(req, res, next) {
                next();
            };
        }

        return async function captchaMiddleware(req, res, next) {
            let captchaResponse;

            try {
                if (!req.body || !req.body.token) {
                    throw new BadRequestError({
                        message: 'hCaptcha token missing'
                    });
                }

                captchaResponse = await hcaptcha.verify(secretKey, req.body.token, req.ip);

                if ('score' in captchaResponse && captchaResponse.score < scoreThreshold) {
                    // Using hCaptcha enterprise, so score is present
                    next();
                } else if (!('score' in captchaResponse) && captchaResponse.success) {
                    // Using regular hCaptcha, so challenge-based
                    next();
                } else {
                    logging.error(`Blocking request due to high score (${captchaResponse.score})`);

                    // Intentionally left sparse to avoid leaking information
                    throw new InternalServerError();
                }
            } catch (err) {
                if (errorUtils.isGhostError(err)) {
                    return next(err);
                } else {
                    const message = 'Failed to verify hCaptcha token';

                    logging.error(new InternalServerError({
                        message,
                        err
                    }));

                    return next(new InternalServerError({
                        message
                    }));
                }
            }
        };
    }
}

module.exports = CaptchaService;
