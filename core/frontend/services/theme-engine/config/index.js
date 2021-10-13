const _ = require('lodash');
const defaultConfig = require('./defaults');
const allowedKeys = ['posts_per_page', 'image_sizes', 'card_assets'];

module.exports.create = function configLoader(packageJson) {
    let config = _.cloneDeep(defaultConfig);

    if (packageJson && Object.prototype.hasOwnProperty.call(packageJson, 'config')) {
        config = _.assign(config, _.pick(packageJson.config, allowedKeys));
    }

    // @TOD0: remove this guard when we're ready
    // Temporary override to prevent themes from controlling this until we're ready
    config.card_assets = defaultConfig.card_assets;

    return config;
};
