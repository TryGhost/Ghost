const crypto = require('crypto');

class RequestIntegrityTokenProvider {
    #themeSecret;
    #tokenDuration;

    /**
     * @param {object} options
     * @param {string} options.themeSecret
     * @param {number} options.tokenDuration
     */
    constructor(options) {
        this.#themeSecret = options.themeSecret;
        this.#tokenDuration = options.tokenDuration;
    }

    /**
     * @returns {string}
     */
    create() {
        const currentTime = Date.now();
        const expiryTime = currentTime + this.#tokenDuration;
        const nonce = crypto.randomBytes(16).toString('hex');
        const hmac = crypto.createHmac('sha256', this.#themeSecret);
        hmac.update(`${expiryTime.toString()}:${nonce}`);
        return `${expiryTime.toString()}:${nonce}:${hmac.digest('hex')}`;
    }

    /**
     * @param {string} token
     * @returns {boolean}
     */
    validate(token) {
        const parts = token.split(':');
        if (parts.length !== 3) {
            // Invalid token string
            return false;
        }

        const nonce = parts[0];
        const timestamp = parseInt(parts[1], 10);
        const hmacDigest = parts[2];

        const hmac = crypto.createHmac('sha256', this.#themeSecret);
        hmac.update(`${nonce}:${timestamp.toString()}`);
        const expectedHmac = hmac.digest('hex');

        if (expectedHmac !== hmacDigest) {
            // HMAC mismatch
            return false;
        }

        if (Date.now() > timestamp) {
            // Token expired
            return false;
        }

        return true;
    }
}

module.exports = RequestIntegrityTokenProvider;
