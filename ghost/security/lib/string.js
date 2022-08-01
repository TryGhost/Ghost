const slugify = require('@tryghost/string').slugify;

module.exports.safe = function safe(string, options = {}) {
    let opts = {requiredChangesOnly: true};
    if (!('importing' in options) || !options.importing) {
        opts.requiredChangesOnly = false;
    }
    return slugify(string, opts);
};
