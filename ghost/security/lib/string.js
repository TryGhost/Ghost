const _ = require('lodash');
const slugify = require('@tryghost/string').slugify;

module.exports.safe = function safe(string, options) {
    options = options || {};
    let opts = {requiredChangesOnly: true};
    if (!_.has(options, 'importing') || !options.importing) {
        opts.requiredChangesOnly = false;
    }
    return slugify(string, opts);
};
