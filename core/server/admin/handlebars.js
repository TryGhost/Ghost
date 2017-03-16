// #  Admin Asset helper
// Usage: `{{asset "css/screen.css"}}`, `{{asset "css/screen.css" ghost="true"}}`
//
// Returns the path to the specified asset. The ghost flag outputs the asset path for the Ghost admin

var config = require('../config'),
    getAssetUrl = require('../data/meta/asset_url'),
    hbs = require('express-hbs'),
    adminHbs = hbs.create(),
    helpers = {};

helpers.adminAsset = function adminAsset(path, options) {
    // This helper is only ever used in admin
    var isAdmin = true,
        minify = false;

    if (options && options.hash && options.hash.minifyInProduction) {
        // we deliberately use config.get('env') here because the setting is referring explicitly to production
        // this is exclusively for the admin panel where we control the logic, not config
        minify = config.get('env') === 'production';
    }

    return new hbs.handlebars.SafeString(
        getAssetUrl(path, isAdmin, minify)
    );
};

module.exports.engine = function setupHandlebars() {
    adminHbs.registerHelper('asset', helpers.adminAsset);
    return adminHbs.express3();
};

// exported for tests only
module.exports._helpers = helpers;
