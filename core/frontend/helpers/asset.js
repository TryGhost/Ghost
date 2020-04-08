// # Asset helper
// Usage: `{{asset "css/screen.css"}}`
//
// Returns the path to the specified asset.
const {SafeString, metaData, errors, i18n} = require('../services/proxy');
const get = require('lodash/get');
const {getAssetUrl} = metaData;

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
