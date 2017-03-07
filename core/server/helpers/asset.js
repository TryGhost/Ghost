// # Asset helper
// Usage: `{{asset "css/screen.css"}}`, `{{asset "css/screen.css"}}`
//
// Returns the path to the specified asset.

var getAssetUrl = require('../data/meta/asset_url'),
    hbs = require('express-hbs');

function asset(path) {
    return new hbs.handlebars.SafeString(
        getAssetUrl(path)
    );
}

module.exports = asset;
