// # Asset helper
// Usage: `{{asset "css/screen.css"}}`, `{{asset "css/screen.css" ghost="true"}}`
//
// Returns the path to the specified asset. The ghost flag outputs the asset path for the Ghost admin
const proxy = require('./proxy'),
    get = require('lodash/get'),
    getAssetUrl = proxy.metaData.getAssetUrl,
    SafeString = proxy.SafeString;

module.exports = function asset(path, options) {
    const hasMinFile = get(options, 'hash.hasMinFile');

    return new SafeString(
        getAssetUrl(path, hasMinFile)
    );
};
