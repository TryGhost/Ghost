const hcaptchaMiddleware = require('./hcaptcha-middleware');
const logging = require('@tryghost/logging');
const {InternalServerError} = require('@tryghost/errors');

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

    isEnabled() {
        return this.#enabled;
    }

    getTokenMiddleware() {
        if (this.#enabled) {
            return hcaptchaMiddleware(this.#secretKey);
        } else {
            return (req, res, next) => next();
        }
    }

    getEvaluationMiddleware() {
        if (this.#enabled) {
            return (req, res, next) => {
                if (req.hcaptcha.score < this.#scoreThreshold) {
                    next();
                } else {
                    logging.error(`Blocking request due to high score (${req.hcaptcha.score})`);

                    // Intentionally left sparse to avoid leaking information
                    next(new InternalServerError());
                }
            };
        } else {
            return (req, res, next) => next();
        }
    }
}

module.exports = CaptchaService;
