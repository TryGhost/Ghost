const crypto = require('crypto');

/**
 * Placeholder access-code generator — returns `fake-###`.
 * The real format will be implemented in a follow-up PR.
 *
 * @returns {string}
 */
function generatePrivateSiteAccessCode() {
    const number = crypto.randomInt(1000).toString().padStart(3, '0');
    return `fake-${number}`;
}

module.exports = {generatePrivateSiteAccessCode};
