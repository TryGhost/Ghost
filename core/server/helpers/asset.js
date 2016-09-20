// # Asset helper
// Usage: `{{asset "css/screen.css"}}`, `{{asset "css/screen.css" ghost="true"}}`
//
// Returns the path to the specified asset. The ghost flag outputs the asset path for the Ghost admin

var getAssetUrl = require('../data/meta/asset_url'),
    hbs = require('express-hbs');

function asset(path, options) {
    var isAdmin,
        minify;

    if (options && options.hash) {
        isAdmin = options.hash.ghost;
        minify = options.hash.minifyInProduction;
    }
    if (process.env.NODE_ENV !== 'production') {
        minify = false;
    }
    return new hbs.handlebars.SafeString(
        getAssetUrl(path, isAdmin, minify)
    );
}

module.exports = asset;
