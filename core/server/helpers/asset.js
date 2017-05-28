// # Asset helper
// Usage: `{{asset "css/screen.css"}}`, `{{asset "css/screen.css" ghost="true"}}`,
// `{{asset "translations/{theme}_{lang}.css" theme=(theme) lang=(lang)}}`
//
// Returns the path to the specified asset. The ghost flag outputs the asset path for the Ghost admin
var proxy = require('./proxy'),
    _ = require('lodash'),
    getAssetUrl = proxy.metaData.getAssetUrl,
    SafeString = proxy.SafeString,
    hasMinFile;

module.exports = function asset(path, options) {
    hasMinFile = _.get(options, 'hash.hasMinFile');

    // Optional replacements; Handlebars subexpressions such as (lang) can be used in parameters
    if (options !== undefined) {
        for (var prop in options.hash) {
            if (options.hash.hasOwnProperty(prop)) {
                path = path.replace('{' + prop + '}', options.hash[prop]);
            }
        }
    }

    return new SafeString(
        getAssetUrl(path, hasMinFile)
    );
};
