const hCaptcha = require('express-hcaptcha');
const {BadRequestError} = require('@tryghost/errors');

class CaptchaService {
    #enabled;
    #middleware;

    /**
     * @param {Object} options
     * @param {boolean} [options.enabled] Whether hCaptcha is enabled
     * @param {string} [options.secretKey] hCaptcha secret key
     */
    constructor({
        enabled,
        secretKey
    }) {
        this.#enabled = enabled;
        this.#middleware = hCaptcha.middleware.validate(secretKey);
    }

    isEnabled() {
        return this.#enabled;
    }

    getTokenMiddleware() {
        if (this.#enabled) {
            return this.#middleware;
        } else {
            return (req, res, next) => next();
        }
    }

    getEvaluationMiddleware() {
        if (this.#enabled) {
            return (req, res, next) => {
                if (req.hcaptcha.success === true) {
                    next();
                } else {
                    next(new BadRequestError({
                        message: 'Unsuccessful verification'
                    }));
                }
            };
        } else {
            return (req, res, next) => next();
        }
    }
}

module.exports = CaptchaService;
