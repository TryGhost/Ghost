// # Asset helper
// Usage: `{{asset "css/screen.css"}}`
//
// Returns the path to the specified asset.
const {metaData} = require('../services/proxy');
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

    return new SafeString(
        getAssetUrl(path, hasMinFile)
    );
};
