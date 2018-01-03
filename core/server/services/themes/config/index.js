var _ = require('lodash'),
    defaultConfig = require('./defaults'),
    allowedKeys = ['posts_per_page'];

module.exports.create = function configLoader(packageJson) {
    var config = _.cloneDeep(defaultConfig);

    if (packageJson && packageJson.hasOwnProperty('config')) {
        config = _.assign(config, _.pick(packageJson.config, allowedKeys));
    }

    return config;
};
