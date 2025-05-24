const _ = require('lodash');
const config = require('../../core/shared/config');
const configUtils = {};

configUtils.config = config;
configUtils.defaultConfig = _.cloneDeep(config.get());
configUtils.suiteConfig = _.cloneDeep(config.get());

/**
 * Set a config value for the whole test suite.
 */
configUtils.setForSuite = function (key, value) {
    configUtils.suiteConfig[key] = value;
    config.set(key, value);
};

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
configUtils.restore = async function () {
    /**
     * we have to reset the whole config object
     * config keys, which get set via a test and do not exist in the config files, won't get reseted
     */
    await new Promise((resolve) => {
        config.reset(() => {
            resolve();
        });
    });

    _.each(configUtils.suiteConfig, function (value, key) {
        config.set(key, _.cloneDeep(value));
    });
};

configUtils.fullRestore = async function () {
    _.each(configUtils.defaultConfig, function (value, key) {
        config.set(key, _.cloneDeep(value));
    });
};

module.exports = configUtils;
