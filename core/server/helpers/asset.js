// # Asset helper
// Usage: `{{asset "css/screen.css"}}`
//
// Returns the path to the specified asset.
const proxy = require('./proxy');
const get = require('lodash/get');
const {SafeString} = proxy;
const {getAssetUrl} = proxy.metaData;

module.exports = function asset(path, options) {
    const hasMinFile = get(options, 'hash.hasMinFile');

    return new SafeString(
        getAssetUrl(path, hasMinFile)
    );
};
