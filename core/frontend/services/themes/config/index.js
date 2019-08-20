var _ = require('lodash'),
    defaultConfig = require('./defaults'),
    allowedKeys = ['posts_per_page', 'image_sizes', 'theme'];

module.exports.create = function configLoader(packageJson) {
    var config = _.cloneDeep(defaultConfig);

    if (packageJson && Object.prototype.hasOwnProperty.call(packageJson, 'config')) {
        config = _.assign(config, _.pick(packageJson.config, allowedKeys));
    }

    return config;
};
