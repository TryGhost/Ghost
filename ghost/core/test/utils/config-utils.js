const _ = require('lodash');
const net = require('net');
const config = require('../../core/shared/config');
const configUtils = {};

configUtils.config = config;
configUtils.defaultConfig = _.cloneDeep(config.get());

// The redirects FileStore basePath is lazily derived from the content path
// (adapter-manager/config.js: `basePath ||= getContentPath('data')`) and then
// cached on the shared nconf `adapters` object. In production the content path
// is fixed for the process lifetime, so freezing it is fine; under the shared
// e2e boot (isolate:false) each file points the content path at a fresh tmp
// folder, but the frozen basePath keeps the redirects adapter reading the first
// booter's folder — leaking another file's redirects.yaml/json into e.g. the
// redirects download suite. Clear it whenever the content path moves so the next
// boot re-derives it. (PLA-173)
const clearDerivedContentPaths = function () {
    config.set('adapters:redirects:FileStore:basePath', undefined);
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
        if (Object.prototype.hasOwnProperty.call(key, 'paths:contentPath')) {
            clearDerivedContentPaths();
        }
    } else {
        config.set(key, value);
        if (key === 'paths:contentPath') {
            clearDerivedContentPaths();
        }
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

    _.each(configUtils.defaultConfig, function (value, key) {
        config.set(key, _.cloneDeep(value));
    });
};

configUtils.getServerUrl = function ({protocol = 'http'} = {}) {
    const host = config.get('server:host');
    const port = config.get('server:port');
    const hostname = net.isIPv6(host) ? `[${host}]` : host;

    return `${protocol}://${hostname}:${port}`;
};

module.exports = configUtils;
