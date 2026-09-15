/**
 * PKCE helpers for ATProto OAuth (RFC 7636, S256 method only).
 */
const crypto = require('node:crypto');

/**
 * Generate a cryptographically random code verifier.
 * @returns {string} base64url-encoded 32-byte random value
 */
function generateCodeVerifier() {
    return crypto.randomBytes(32).toString('base64url');
}

/**
 * Derive the S256 code challenge from a verifier.
 * @param {string} verifier
 * @returns {string} base64url-encoded SHA-256 digest
 */
function deriveCodeChallenge(verifier) {
    return crypto.createHash('sha256').update(verifier).digest('base64url');
}

module.exports = {generateCodeVerifier, deriveCodeChallenge};
