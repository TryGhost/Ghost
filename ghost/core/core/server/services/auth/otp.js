const {totp} = require('otplib');

totp.options = {
    digits: 6,
    step: 60,
    window: [10, 10]
};

/**
 * Generate a TOTP token for a user
 * @param {string} userId - The user's ID
 * @param {string} secret - The admin session secret
 * @param {string} [context] - Optional session-specific context to bind the token
 * @returns {string} - The generated 6-digit token
 */
function generate(userId, secret, context = '') {
    return totp.generate(`${secret}${userId}${context}`);
}

/**
 * Verify a TOTP token for a user
 * @param {string} userId - The user's ID
 * @param {string} token - The token to verify
 * @param {string} secret - The admin session secret
 * @param {string} [context] - Optional session-specific context to bind the token
 * @returns {boolean} - Whether the token is valid
 */
function verify(userId, token, secret, context = '') {
    return totp.check(token, `${secret}${userId}${context}`);
}

module.exports = {
    generate,
    verify
};
