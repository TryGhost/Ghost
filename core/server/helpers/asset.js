// # Asset helper
// Usage: `{{asset "css/screen.css"}}`, `{{asset "css/screen.css" ghost="true"}}`
//
// Returns the path to the specified asset. The ghost flag outputs the asset path for the Ghost admin
var proxy = require('./proxy'),
    config = proxy.config,
    getAssetUrl = proxy.metaData.getAssetUrl,
    SafeString = proxy.SafeString;

module.exports = function asset(path, options) {
    var isAdmin,
        minify;

    if (options && options.hash) {
        isAdmin = options.hash.ghost;
        minify = options.hash.minifyInProduction;
    }

    if (config.get('minifyAssets') === false) {
        minify = false;
    }

    return new SafeString(
        getAssetUrl(path, isAdmin, minify)
    );
};
