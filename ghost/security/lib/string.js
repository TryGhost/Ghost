const slugify = require('@tryghost/string').slugify;

/**
 * @param {string} string
 * @param {{importing?: boolean}} [options]
 */
module.exports.safe = function safe(string, options = {}) {
    return slugify(string, {requiredChangesOnly: options.importing === true});
};
