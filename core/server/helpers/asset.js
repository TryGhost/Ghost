// # Asset helper
// Usage: `{{asset "css/screen.css"}}`, `{{asset "css/screen.css" ghost="true"}}`
//
// Returns the path to the specified asset. The ghost flag outputs the asset path for the Ghost admin
var proxy = require('./proxy'),
    _ = require('lodash'),
    getAssetUrl = proxy.metaData.getAssetUrl,
    SafeString = proxy.SafeString;

module.exports = function asset(path, options) {
    var hasMinFile = _.get(options, 'hash.hasMinFile');

    return new SafeString(
        getAssetUrl(path, hasMinFile)
    );
};
