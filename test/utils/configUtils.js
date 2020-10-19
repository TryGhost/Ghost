const _ = require('lodash');
const config = require('../../core/shared/config');
const configUtils = {};

configUtils.config = config;
configUtils.defaultConfig = _.cloneDeep(config.get());

/**
 * configUtils.set({});
 * configUtils.set('key', 'value');
 */
configUtils.set = function () {
    const key = arguments[0];
    const value = arguments[1];

    if (_.isObject(key)) {
        _.each(key, function (settingValue, settingKey) {
            config.set(settingKey, settingValue);
        });
    } else {
        config.set(key, value);
    }
};

/**
 * important: do not delete cloneDeep for value
 * nconf keeps this as a reference and then it can happen that the defaultConfig get's overridden by new values
 */
configUtils.restore = function () {
    /**
     * we have to reset the whole config object
     * config keys, which get set via a test and do not exist in the config files, won't get reseted
     */
    config.reset();

    _.each(configUtils.defaultConfig, function (value, key) {
        config.set(key, _.cloneDeep(value));
    });
};

module.exports = configUtils;
