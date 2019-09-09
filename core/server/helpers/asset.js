// # Asset helper
// Usage: `{{asset "css/screen.css"}}`, `{{asset "css/screen.css" ghost="true"}}`
//
// Returns the path to the specified asset. The ghost flag outputs the asset path for the Ghost admin
const proxy = require('./proxy'),
    get = require('lodash/get'),
    i18n = proxy.i18n,
    errors = proxy.errors,
    getAssetUrl = proxy.metaData.getAssetUrl,
    SafeString = proxy.SafeString;

module.exports = function asset(path, options) {
    const hasMinFile = get(options, 'hash.hasMinFile');

    if (!path) {
        throw new errors.IncorrectUsageError({
            message: i18n.t('warnings.helpers.asset.pathIsRequired')
        });
    }

    return new SafeString(
        getAssetUrl(path, hasMinFile)
    );
};
