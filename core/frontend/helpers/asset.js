// # Asset helper
// Usage: `{{asset "css/screen.css"}}`
//
// Returns the path to the specified asset.
const {metaData, urlUtils} = require('../services/proxy');
const {SafeString} = require('../services/rendering');

const errors = require('@tryghost/errors');
const tpl = require('@tryghost/tpl');
const get = require('lodash/get');
const {getAssetUrl} = metaData;

const messages = {
    pathIsRequired: 'The {{asset}} helper must be passed a path'
};

module.exports = function asset(path, options) {
    const hasMinFile = get(options, 'hash.hasMinFile');

    if (!path) {
        throw new errors.IncorrectUsageError({
            message: tpl(messages.pathIsRequired)
        });
    }
    if (typeof urlUtils.getSiteUrl() !== 'undefined'
            && typeof urlUtils.getAdminUrl() !== 'undefined'
            && urlUtils.getSiteUrl() !== urlUtils.getAdminUrl()) {
        const target = new URL(getAssetUrl(path, hasMinFile), urlUtils.getSiteUrl());
        return new SafeString(
            target.href
        );
    }

    return new SafeString(
        getAssetUrl(path, hasMinFile)
    );
};
