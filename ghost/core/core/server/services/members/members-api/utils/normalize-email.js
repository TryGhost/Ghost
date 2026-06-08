const {parseEmailAddress} = require('@tryghost/parse-email-address');

/**
 * Normalizes email addresses by converting Unicode domains to ASCII (punycode)
 * This prevents homograph attacks where Unicode characters are used to spoof
 * domains
 *
 * @param {string} email The email address to normalize
 * @returns {null | string} The normalized email address, or null if the email can't be normalized
 */
function normalizeEmail(email) {
    if (typeof email !== 'string') {
        return null;
    }

    const parsedEmail = parseEmailAddress(email);
    if (!parsedEmail) {
        return null;
    }

    const {local, domain} = parsedEmail;
    return `${local}@${domain}`;
}

module.exports = normalizeEmail;
