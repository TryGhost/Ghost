const crypto = require('crypto');
const {ValidationError} = require('@tryghost/errors');

// Minimum secret length in bytes; hexSecret must be at least 2x this in hex chars
const REQUIRED_SECRET_LENGTH = 64;

/**
 * Creates an OTC verification hash using HMAC-SHA256
 * 
 * @param {string} otc - The one-time code
 * @param {string} token - The token value
 * @param {number} timestamp - Unix timestamp in seconds
 * @param {string} hexSecret - Hex-encoded secret key
 * @returns {string} The HMAC digest as hex string
 */
function createOTCVerificationHash(otc, token, timestamp, hexSecret) {
    if (!hexSecret) {
        throw new ValidationError({
            message: 'Authentication secret not configured'
        });
    }

    // Validate that the secret is a valid hex string of sufficient length
    if (typeof hexSecret !== 'string' || !/^[0-9a-fA-F]+$/.test(hexSecret) || (hexSecret.length % 2 !== 0) || (hexSecret.length < REQUIRED_SECRET_LENGTH * 2)) {
        throw new ValidationError({
            message: 'Authentication secret not properly configured'
        });
    }

    const secret = Buffer.from(hexSecret, 'hex');
    if (secret.length < REQUIRED_SECRET_LENGTH) {
        throw new ValidationError({
            message: 'Authentication secret not properly configured'
        });
    }

    const dataToHash = `${otc}:${token}:${timestamp}`;
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(dataToHash);
    return hmac.digest('hex');
}

module.exports = {
    createOTCVerificationHash,
    REQUIRED_SECRET_LENGTH
};
