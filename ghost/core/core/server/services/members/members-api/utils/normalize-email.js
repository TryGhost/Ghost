const punycode = require('punycode/');

/**
 * Normalizes email addresses by converting Unicode domains to ASCII (punycode)
 * This prevents homograph attacks where Unicode characters are used to spoof
 * domains
 *
 * @param {string} email The email address to normalize
 * @returns {string} The normalized email address
 * @throws {Error} When punycode conversion fails
 */
function normalizeEmail(email) {
    if (!email || typeof email !== 'string') {
        return null;
    }

    const atIndex = email.lastIndexOf('@');

    if (atIndex === -1) {
        return email;
    }

    const localPart = email.substring(0, atIndex);
    const domainPart = email.substring(atIndex + 1);

    const asciiDomain = punycode.toASCII(domainPart);

    return `${localPart}@${asciiDomain}`;
}

module.exports = normalizeEmail;
