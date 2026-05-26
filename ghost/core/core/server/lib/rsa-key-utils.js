const crypto = require('crypto');

/** Minimum RSA modulus length required for RS512 JWT verification (e.g. jose). */
const RSA_KEY_BITS_FOR_RS512 = 2048;

/**
 * @param {string} publicKeyPem
 * @returns {number} Modulus length in bits, or 0 if the key cannot be parsed.
 */
function getRsaModulusLength(publicKeyPem) {
    if (!publicKeyPem) {
        return 0;
    }

    try {
        const publicKey = crypto.createPublicKey({
            key: publicKeyPem,
            format: 'pem'
        });

        return publicKey.asymmetricKeyDetails?.modulusLength ?? 0;
    } catch {
        return 0;
    }
}

/**
 * @param {string} publicKeyPem
 * @returns {boolean}
 */
function isRsaKeyCompatibleWithRS512(publicKeyPem) {
    return getRsaModulusLength(publicKeyPem) >= RSA_KEY_BITS_FOR_RS512;
}

module.exports = {
    RSA_KEY_BITS_FOR_RS512,
    getRsaModulusLength,
    isRsaKeyCompatibleWithRS512
};
