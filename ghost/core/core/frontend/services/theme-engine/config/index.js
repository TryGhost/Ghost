const _ = require('lodash');
const defaultConfig = require('./defaults');
const allowedKeys = ['posts_per_page', 'image_sizes', 'card_assets'];

module.exports.create = function configLoader(packageJson) {
    let config = _.cloneDeep(defaultConfig);

    if (packageJson && Object.prototype.hasOwnProperty.call(packageJson, 'config')) {
        config = _.assign(config, _.pick(packageJson.config, allowedKeys));
    }

    return config;
};
