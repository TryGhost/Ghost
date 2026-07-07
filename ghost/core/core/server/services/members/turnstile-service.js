const logging = require('@tryghost/logging');
const {BadRequestError, InternalServerError, utils: errorUtils} = require('@tryghost/errors');
const externalRequest = require('../../lib/request-external');

/**
 * Verifies Cloudflare Turnstile tokens on member signup/signin requests.
 *
 * `enabled` and `secretKey` may be plain values or functions. Functions are
 * evaluated on every request so that flipping the labs flag or editing the
 * keys in settings takes effect without a restart.
 */
class TurnstileService {
    #enabled;
    #secretKey;
    #siteverifyUrl;

    /**
     * @param {Object} options
     * @param {boolean|(() => boolean)} [options.enabled] Whether Turnstile verification is enabled
     * @param {string|(() => string|null)} [options.secretKey] Turnstile secret key
     * @param {string} options.siteverifyUrl Cloudflare siteverify endpoint
     */
    constructor({enabled, secretKey, siteverifyUrl}) {
        this.#enabled = enabled;
        this.#secretKey = secretKey;
        this.#siteverifyUrl = siteverifyUrl;
    }

    #isEnabled() {
        return typeof this.#enabled === 'function' ? this.#enabled() : this.#enabled;
    }

    #getSecretKey() {
        return typeof this.#secretKey === 'function' ? this.#secretKey() : this.#secretKey;
    }

    getMiddleware() {
        return async (req, res, next) => {
            // Inactive unless the flag is on AND a secret key is configured;
            // checked per request so settings changes apply without a restart
            const secretKey = this.#isEnabled() && this.#getSecretKey();
            if (!secretKey) {
                return next();
            }

            try {
                if (!req.body || !req.body.turnstileToken) {
                    throw new BadRequestError({
                        message: 'Turnstile token missing'
                    });
                }

                const {body: verifyResponse} = await externalRequest.post(this.#siteverifyUrl, {
                    form: {
                        secret: secretKey,
                        response: req.body.turnstileToken,
                        remoteip: req.ip
                    },
                    responseType: 'json'
                });

                if (verifyResponse && verifyResponse.success === true) {
                    return next();
                }

                // Log the codes server-side, but keep the client-facing error
                // deliberately sparse to avoid leaking information to bots
                logging.error(`Turnstile verification failed: ${JSON.stringify(verifyResponse && verifyResponse['error-codes'])}`);

                throw new BadRequestError({
                    message: 'Turnstile verification failed'
                });
            } catch (err) {
                if (errorUtils.isGhostError(err)) {
                    return next(err);
                }

                const message = 'Failed to verify Turnstile token';

                logging.error(new InternalServerError({
                    message,
                    err
                }));

                return next(new InternalServerError({
                    message
                }));
            }
        };
    }
}

module.exports = TurnstileService;
