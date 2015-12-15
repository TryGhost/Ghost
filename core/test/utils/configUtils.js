var _           = require('lodash'),
    config      = require('../../server/config'),
    origConfig  = _.cloneDeep(config),

    configUtils = {};

configUtils.config = config;
configUtils.defaultConfig = _.cloneDeep(config.get());

configUtils.set = function (newConfig) {
    config.set(newConfig);
};

configUtils.restore = function () {
    var topLevelOptional = ['mail', 'updateCheck', 'storage', 'forceAdminSSL', 'urlSSL', 'compress', 'privacy'];

    config.set(_.merge({}, origConfig, configUtils.defaultConfig));
    // @TODO make this horror go away
    _.each(topLevelOptional, function (option) {
        if (origConfig[option] === undefined) {
            delete config[option];
        }
    });
};

module.exports = configUtils;
